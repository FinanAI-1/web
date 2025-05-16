let monthlyChart = null;
let expensesTrendChart = null;
let needsDistributionChart = null;

export function initializeCharts() {
  const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
  
  // Only create charts if their canvas elements exist
  const monthlyChartCanvas = document.getElementById('monthlyChart');
  if (monthlyChartCanvas) {
    createMonthlyChart(transactions);
  }

  const expensesTrendChartCanvas = document.getElementById('expensesTrendChart');
  if (expensesTrendChartCanvas) {
    createExpensesTrendChart(transactions);
  }

  const needsDistributionChartCanvas = document.getElementById('needsDistributionChart');
  if (needsDistributionChartCanvas) {
    createNeedsDistributionChart(transactions);
  }
}

function createMonthlyChart(transactions) {
  const ctx = document.getElementById('monthlyChart').getContext('2d');
  if (!ctx) return; // Exit if canvas doesn't exist
  
  // Destroy existing chart if it exists
  if (monthlyChart) {
    monthlyChart.destroy();
  }
  
  const monthlyData = processMonthlyData(transactions);

  monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthlyData.labels,
      datasets: [
        {
          label: 'Ingresos',
          data: monthlyData.incomes,
          backgroundColor: '#4CAF50',
        },
        {
          label: 'Gastos',
          data: monthlyData.expenses,
          backgroundColor: '#ff4444',
        }
      ]
    },
    options: {
      responsive: true,
      animation: {
        duration: 500 
      },
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Balance Mensual'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function createExpensesTrendChart(transactions) {
  const ctx = document.getElementById('expensesTrendChart').getContext('2d');
  if (!ctx) return; // Exit if canvas doesn't exist
  
  // Destroy existing chart if it exists
  if (expensesTrendChart) {
    expensesTrendChart.destroy();
  }
  
  const trendData = processExpensesTrend(transactions);

  expensesTrendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trendData.labels,
      datasets: [{
        label: 'Gastos por día',
        data: trendData.values,
        borderColor: '#4CAF50',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      animation: {
        duration: 500 
      },
      plugins: {
        legend: {
          position: 'top',
        }
      }
    }
  });
}

function createNeedsDistributionChart(transactions) {
  const ctx = document.getElementById('needsDistributionChart').getContext('2d');
  if (!ctx) return; // Exit if canvas doesn't exist
  
  // Destroy existing chart if it exists
  if (needsDistributionChart) {
    needsDistributionChart.destroy();
  }
  
  const distributionData = processNeedsDistribution(transactions);

  needsDistributionChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Alta', 'Media', 'Baja'],
      datasets: [{
        data: [
          distributionData.high,
          distributionData.medium,
          distributionData.low
        ],
        backgroundColor: [
          '#4CAF50',
          '#FFA726',
          '#EF5350'
        ]
      }]
    },
    options: {
      responsive: true,
      animation: {
        duration: 500 
      },
      plugins: {
        legend: {
          position: 'top',
        }
      }
    }
  });
}

function processMonthlyData(transactions) {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const currentMonth = new Date().getMonth();
  const labels = months.slice(currentMonth - 5, currentMonth + 1);
  
  const incomes = new Array(6).fill(0);
  const expenses = new Array(6).fill(0);

  transactions.forEach(t => {
    const date = new Date(t.date);
    const monthIndex = months.indexOf(months[date.getMonth()]);
    if (monthIndex >= currentMonth - 5 && monthIndex <= currentMonth) {
      if (t.amount > 0) {
        incomes[monthIndex - (currentMonth - 5)] += t.amount;
      } else {
        expenses[monthIndex - (currentMonth - 5)] += Math.abs(t.amount);
      }
    }
  });

  return { labels, incomes, expenses };
}

function processExpensesTrend(transactions) {
  const days = 14; // Últimos 14 días
  const labels = [];
  const values = new Array(days).fill(0);

  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    labels.push(date.getDate());
  }

  transactions.forEach(t => {
    if (t.amount < 0) {
      const date = new Date(t.date);
      const dayIndex = days - 1 - Math.floor((now - date) / (1000 * 60 * 60 * 24));
      if (dayIndex >= 0 && dayIndex < days) {
        values[dayIndex] += Math.abs(t.amount);
      }
    }
  });

  return { labels, values };
}

function processNeedsDistribution(transactions) {
  const distribution = {
    high: 0,
    medium: 0,
    low: 0
  };

  transactions.forEach(t => {
    if (t.amount < 0) {
      distribution[t.necessity] += Math.abs(t.amount);
    }
  });

  return distribution;
}
import { initializeCharts } from './charts.js';
import { showNotification } from './notifications.js';
import { analyzeFinancialBehavior } from './analysis.js';

// Helper function to format money
function formatMoney(amount) {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(amount));
}

// Global state
let currentTransactionType = 'income';
let isListening = false;
let recognition = null;

// Initialize the application
export function initializeApp() {
  // Update UI based on stored data
  updateDashboard();

  // Initialize speech recognition if voice button exists
  const voiceBtn = document.getElementById('voiceInputBtn');
  if (voiceBtn) {
    initializeSpeechRecognition();
  }
}

// Dashboard update functions
export function updateDashboard() {
  const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
  
  // Update total balance
  const totalBalance = document.getElementById('totalBalance');
  if (totalBalance) {
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    totalBalance.textContent = formatMoney(total);
  }

  // Update monthly income/expense
  const monthlyIncome = document.getElementById('monthlyIncome');
  const monthlyExpense = document.getElementById('monthlyExpense');
  
  if (monthlyIncome && monthlyExpense) {
    const now = new Date();
    const thisMonth = transactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    const income = thisMonth.reduce((sum, t) => t.amount > 0 ? sum + t.amount : sum, 0);
    const expenses = thisMonth.reduce((sum, t) => t.amount < 0 ? sum + Math.abs(t.amount) : sum, 0);

    monthlyIncome.textContent = `+$${formatMoney(income)}`;
    monthlyExpense.textContent = `-$${formatMoney(expenses)}`;
  }

  // Initialize charts if they exist
  const hasCharts = document.getElementById('monthlyChart');
  if (hasCharts) {
    initializeCharts();
  }

  // Update recommendations and alerts
  generateRecommendations();
  updateAlerts();
}

export function generateRecommendations() {
  const recommendationsList = document.getElementById('recommendationsList');
  if (!recommendationsList) return;

  const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
  const goals = JSON.parse(localStorage.getItem('goals')) || [];
  
  let recommendations = [];

  // Calculate metrics
  const lastMonthTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    return date >= lastMonth;
  });

  const totalIncome = lastMonthTransactions.reduce((sum, t) => t.amount > 0 ? sum + t.amount : sum, 0);
  const totalExpenses = lastMonthTransactions.reduce((sum, t) => t.amount < 0 ? sum + Math.abs(t.amount) : sum, 0);
  const savings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

  // Generate recommendations
  if (savingsRate < 20) {
    recommendations.push({
      title: 'Aumenta tu tasa de ahorro',
      message: 'Intenta ahorrar al menos el 20% de tus ingresos mensuales.',
      type: 'warning'
    });
  }

  const unnecessaryExpenses = lastMonthTransactions.filter(t => 
    t.amount < 0 && t.necessity === 'low'
  ).reduce((sum, t) => sum + Math.abs(t.amount), 0);

  if (unnecessaryExpenses > totalIncome * 0.3) {
    recommendations.push({
      title: 'Gastos no esenciales elevados',
      message: 'Los gastos en categorías no esenciales superan el 30% de tus ingresos.',
      type: 'warning'
    });
  }

  const overdueGoals = goals.filter(g => {
    const deadline = new Date(g.date);
    return !g.completed && deadline < new Date();
  });

  if (overdueGoals.length > 0) {
    recommendations.push({
      title: 'Objetivos atrasados',
      message: `Tienes ${overdueGoals.length} objetivo(s) financiero(s) atrasado(s).`,
      type: 'error'
    });
  }

  // Update recommendations list
  recommendationsList.innerHTML = recommendations.length > 0 ? 
    recommendations.map(rec => `
      <div class="alert ${rec.type}">
        <div class="alert-icon">${rec.type === 'warning' ? '⚠️' : '❌'}</div>
        <div class="alert-content">
          <h4>${rec.title}</h4>
          <p>${rec.message}</p>
        </div>
      </div>
    `).join('') :
    '<p>¡Buen trabajo! No hay recomendaciones pendientes.</p>';
}

export function updateAlerts() {
  const alertsList = document.getElementById('alertsList');
  if (!alertsList) return;

  const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
  const goals = JSON.parse(localStorage.getItem('goals')) || [];
  const alerts = [];

  // Check for low balance
  const balance = transactions.reduce((sum, t) => sum + t.amount, 0);
  if (balance < 100) {
    alerts.push({
      title: 'Balance bajo',
      message: 'Tu balance actual está por debajo de $100',
      type: 'warning'
    });
  }

  // Check for upcoming goal deadlines
  const today = new Date();
  goals.forEach(goal => {
    if (!goal.completed) {
      const deadline = new Date(goal.date);
      const daysUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDeadline > 0 && daysUntilDeadline <= 7) {
        alerts.push({
          title: 'Objetivo próximo a vencer',
          message: `"${goal.name}" vence en ${daysUntilDeadline} días`,
          type: 'warning'
        });
      } else if (daysUntilDeadline <= 0) {
        alerts.push({
          title: 'Objetivo vencido',
          message: `"${goal.name}" ha vencido`,
          type: 'error'
        });
      }
    }
  });

  // Check for unusual spending patterns
  const lastWeekExpenses = transactions.filter(t => {
    const date = new Date(t.date);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    return date >= lastWeek && t.amount < 0;
  });

  const averageWeeklyExpense = Math.abs(lastWeekExpenses.reduce((sum, t) => sum + t.amount, 0));
  if (averageWeeklyExpense > 1000) {
    alerts.push({
      title: 'Gasto semanal elevado',
      message: 'Tus gastos esta semana son más altos de lo usual',
      type: 'warning'
    });
  }

  // Update alerts list
  alertsList.innerHTML = alerts.length > 0 ? 
    alerts.map(alert => `
      <div class="alert ${alert.type}">
        <div class="alert-icon">${alert.type === 'warning' ? '⚠️' : '❌'}</div>
        <div class="alert-content">
          <h4>${alert.title}</h4>
          <p>${alert.message}</p>
        </div>
      </div>
    `).join('') :
    '<p>No hay alertas pendientes.</p>';
}

// Voice input handling
function initializeSpeechRecognition() {
  if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'es-ES';

    recognition.onresult = function(event) {
      const text = event.results[0][0].transcript.toLowerCase();
      processVoiceCommand(text);
    };

    recognition.onerror = function(event) {
      showNotification('Error', 'No se pudo reconocer el comando de voz', 'error');
      stopListening();
    };

    recognition.onend = function() {
      stopListening();
    };
  } else {
    const voiceBtn = document.getElementById('voiceInputBtn');
    if (voiceBtn) voiceBtn.style.display = 'none';
  }
}

export function toggleVoiceInput() {
  if (!isListening) {
    startListening();
  } else {
    stopListening();
  }
}

function startListening() {
  if (recognition) {
    recognition.start();
    isListening = true;
    const voiceBtn = document.getElementById('voiceInputBtn');
    if (voiceBtn) voiceBtn.classList.add('listening');
    showNotification('Escuchando...', 'Di "gasto" o "ingreso" seguido del monto y la descripción', 'info');
  }
}

function stopListening() {
  if (recognition) {
    recognition.stop();
    isListening = false;
    const voiceBtn = document.getElementById('voiceInputBtn');
    if (voiceBtn) voiceBtn.classList.remove('listening');
  }
}

function processVoiceCommand(text) {
  // Voice command processing logic here
  console.log('Processing voice command:', text);
}

function showScheduleModal() {
  const modal = document.getElementById('scheduleModal');
  if (modal) {
    // Update goals dropdown
    const goals = JSON.parse(localStorage.getItem('goals')) || [];
    const goalSelect = document.getElementById('scheduleGoalContribution');
    if (goalSelect) {
      goalSelect.innerHTML = '<option value="none">Ninguna meta</option>' +
        goals.filter(g => !g.completed)
          .map(g => `<option value="${g.id}">${g.name}</option>`)
          .join('');
    }

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('scheduleStartDate').min = today;
    document.getElementById('scheduleEndDate').min = today;

    modal.style.display = 'block';
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();

  // Set up schedule form handler
  const scheduleForm = document.getElementById('scheduleForm');
  if (scheduleForm) {
    scheduleForm.addEventListener('submit', handleScheduleSubmit);
  }

  // Process scheduled transactions
  processScheduledTransactions();
});

function handleScheduleSubmit(e) {
  e.preventDefault();

  const scheduledTransaction = {
    id: Date.now(),
    type: document.getElementById('scheduleType').value,
    amount: parseFloat(document.getElementById('scheduleAmount').value),
    description: document.getElementById('scheduleDescription').value,
    category: document.getElementById('scheduleCategory').value,
    frequency: document.getElementById('scheduleFrequency').value,
    startDate: document.getElementById('scheduleStartDate').value,
    endDate: document.getElementById('scheduleEndDate').value || null,
    goalContribution: document.getElementById('scheduleGoalContribution').value,
    lastProcessed: null
  };

  const scheduledTransactions = JSON.parse(localStorage.getItem('scheduledTransactions')) || [];
  scheduledTransactions.push(scheduledTransaction);
  localStorage.setItem('scheduledTransactions', JSON.stringify(scheduledTransactions));

  showNotification(
    'Transacción programada',
    `Se ha programado ${scheduledTransaction.description} exitosamente`,
    'success'
  );

  closeModal('scheduleModal');
  e.target.reset();
}

function processScheduledTransactions() {
  const scheduledTransactions = JSON.parse(localStorage.getItem('scheduledTransactions')) || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  scheduledTransactions.forEach(scheduled => {
    const startDate = new Date(scheduled.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = scheduled.endDate ? new Date(scheduled.endDate) : null;
    if (endDate) endDate.setHours(0, 0, 0, 0);

    const lastProcessed = scheduled.lastProcessed ? new Date(scheduled.lastProcessed) : null;
    if (lastProcessed) lastProcessed.setHours(0, 0, 0, 0);

    if (startDate <= today && (!endDate || endDate >= today)) {
      let shouldProcess = false;

      switch (scheduled.frequency) {
        case 'once':
          shouldProcess = !lastProcessed;
          break;
        case 'daily':
          shouldProcess = !lastProcessed || 
            (today - lastProcessed) >= (24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          shouldProcess = !lastProcessed || 
            (today - lastProcessed) >= (7 * 24 * 60 * 60 * 1000);
          break;
        case 'biweekly':
          shouldProcess = !lastProcessed || 
            (today - lastProcessed) >= (14 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          shouldProcess = !lastProcessed || 
            (today.getMonth() !== lastProcessed.getMonth() || 
             today.getFullYear() !== lastProcessed.getFullYear());
          break;
        case 'quarterly':
          shouldProcess = !lastProcessed || 
            (Math.floor(today.getMonth() / 3) !== Math.floor(lastProcessed.getMonth() / 3) || 
             today.getFullYear() !== lastProcessed.getFullYear());
          break;
        case 'yearly':
          shouldProcess = !lastProcessed || 
            today.getFullYear() !== lastProcessed.getFullYear();
          break;
      }

      if (shouldProcess) {
        // Create transaction
        const transaction = {
          id: Date.now(),
          type: scheduled.type,
          amount: scheduled.type === 'income' ? scheduled.amount : -scheduled.amount,
          description: scheduled.description,
          category: scheduled.category,
          necessity: getNecessityLevel(scheduled.category),
          date: new Date().toISOString(),
          goalContribution: scheduled.goalContribution !== 'none' ? 
            parseInt(scheduled.goalContribution) : null
        };

        const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        transactions.push(transaction);
        localStorage.setItem('transactions', JSON.stringify(transactions));

        // Update last processed date
        scheduled.lastProcessed = new Date().toISOString();
        localStorage.setItem('scheduledTransactions', 
          JSON.stringify(scheduledTransactions));

        showNotification(
          'Transacción programada ejecutada',
          `Se ha procesado ${transaction.description}`,
          'success'
        );

        // Update dashboard
        updateDashboard();
      }
    }
  });

  // Clean up completed one-time scheduled transactions
  const updatedScheduled = scheduledTransactions.filter(scheduled => {
    if (scheduled.frequency === 'once' && scheduled.lastProcessed) {
      return false;
    }
    const endDate = scheduled.endDate ? new Date(scheduled.endDate) : null;
    if (endDate && endDate < today) {
      return false;
    }
    return true;
  });

  localStorage.setItem('scheduledTransactions', JSON.stringify(updatedScheduled));
}

// Make functions available globally
window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
};

window.showTransactionModal = function(type) {
  currentTransactionType = type;
  const modal = document.getElementById('transactionModal');
  if (modal) {
    modal.style.display = 'block';
    document.querySelector('#transactionModal h2').textContent = 
      type === 'income' ? 'Nuevo Ingreso' : 'Nuevo Gasto';
    
    // Update goal contribution select options
    const goalContribSelect = document.getElementById('goalContribution');
    if (goalContribSelect) {
      const goals = JSON.parse(localStorage.getItem('goals')) || [];
      const activeGoals = goals.filter(g => !g.completed);
      
      goalContribSelect.innerHTML = '<option value="none">Ninguna meta</option>' +
        activeGoals.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    }
  }
};

window.toggleVoiceInput = toggleVoiceInput;
window.showScheduleModal = showScheduleModal;

// Add this to your existing interval checks or setInterval
setInterval(processScheduledTransactions, 60000); // Check every minute
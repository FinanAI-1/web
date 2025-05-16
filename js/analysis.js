export function analyzeFinancialBehavior() {
  try {
    const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    const goals = JSON.parse(localStorage.getItem('goals')) || [];
    const analysisDiv = document.getElementById('behaviorAnalysis');
    const categoryBreakdownDiv = document.getElementById('categoryBreakdown');

    function formatMoney(amount) {
      return new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(Math.abs(amount));
    }

    if (!transactions.length) {
      if (categoryBreakdownDiv) {
        categoryBreakdownDiv.innerHTML = '<p class="empty-state">Comienza a registrar transacciones para ver el desglose por categorías.</p>';
      }
      if (analysisDiv) {
        analysisDiv.innerHTML = '<p class="empty-state">Comienza a registrar transacciones para ver tu análisis financiero.</p>';
      }
      return;
    }

    // Define categories with their metadata
    const categories = {
      food: { name: 'Alimentación', icon: '🍽️', color: '#4CAF50' },
      bills: { name: 'Servicios', icon: '📄', color: '#2196F3' },
      health: { name: 'Salud', icon: '🏥', color: '#E91E63' },
      housing: { name: 'Vivienda', icon: '🏠', color: '#9C27B0' },
      education: { name: 'Educación', icon: '📚', color: '#FF9800' },
      transport: { name: 'Transporte', icon: '🚗', color: '#795548' },
      clothing: { name: 'Ropa', icon: '👕', color: '#607D8B' },
      insurance: { name: 'Seguros', icon: '🛡️', color: '#FF5722' },
      maintenance: { name: 'Mantenimiento', icon: '🔧', color: '#795548' },
      entertainment: { name: 'Entretenimiento', icon: '🎮', color: '#673AB7' },
      hobbies: { name: 'Pasatiempos', icon: '🎨', color: '#3F51B5' },
      dining: { name: 'Restaurantes', icon: '🍽️', color: '#FFC107' },
      shopping: { name: 'Compras', icon: '🛍️', color: '#8BC34A' },
      travel: { name: 'Viajes', icon: '✈️', color: '#00BCD4' },
      salary: { name: 'Salario', icon: '💰', color: '#4CAF50' },
      savings: { name: 'Ahorro', icon: '🏦', color: '#50C878' },
      other: { name: 'Otros', icon: '📦', color: '#9E9E9E' }
    };

    // Initialize analysis object
    const analysis = {
      totalIncome: 0,
      totalExpenses: 0,
      categoryBreakdown: {},
      categories: categories,
      necessaryExpenses: 0,
      unnecessaryExpenses: 0,
      totalSavings: 0,
      savingsRate: 0,
      trend: 'stable',
      recommendations: [],
      completedGoals: goals.filter(g => g.completed).length,
      activeGoals: goals.filter(g => !g.completed).length
    };

    // Process transactions
    transactions.forEach(transaction => {
      if (transaction.amount < 0) {
        const amount = Math.abs(transaction.amount);
        analysis.totalExpenses += amount;
        
        if (!analysis.categoryBreakdown[transaction.category]) {
          analysis.categoryBreakdown[transaction.category] = {
            total: 0,
            count: 0,
            percentage: 0
          };
        }
        
        analysis.categoryBreakdown[transaction.category].total += amount;
        analysis.categoryBreakdown[transaction.category].count++;
        
        if (transaction.necessity === 'high' || transaction.necessity === 'medium') {
          analysis.necessaryExpenses += amount;
        } else if (!transaction.goalContribution) {
          analysis.unnecessaryExpenses += amount;
        }
        
        if (transaction.goalContribution) {
          analysis.totalSavings += amount;
        }
      } else {
        analysis.totalIncome += transaction.amount;
      }
    });

    // Calculate percentages
    Object.keys(analysis.categoryBreakdown).forEach(category => {
      analysis.categoryBreakdown[category].percentage = 
        (analysis.categoryBreakdown[category].total / analysis.totalExpenses) * 100;
    });

    analysis.savingsRate = analysis.totalIncome > 0 ? 
      (analysis.totalSavings / analysis.totalIncome) * 100 : 0;

    // Determine trend
    const unnecessaryExpenseRatio = analysis.unnecessaryExpenses / analysis.totalExpenses;
    const savingsRatio = analysis.totalSavings / analysis.totalIncome;
    const expenseToIncomeRatio = analysis.totalExpenses / analysis.totalIncome;
    const necessaryExpenseRatio = analysis.necessaryExpenses / analysis.totalExpenses;
  
    // Define thresholds for each trend level
    if (savingsRatio > 0.3 && unnecessaryExpenseRatio < 0.2 && analysis.completedGoals > 2) {
      analysis.trend = 'exceptional';
    } else if (savingsRatio > 0.25 && unnecessaryExpenseRatio < 0.25) {
      analysis.trend = 'excellent';
    } else if (savingsRatio > 0.2 && unnecessaryExpenseRatio < 0.3) {
      analysis.trend = 'improving';
    } else if (savingsRatio > 0.15 && unnecessaryExpenseRatio < 0.35) {
      analysis.trend = 'stable';
    } else if (savingsRatio > 0.1 && unnecessaryExpenseRatio < 0.4) {
      analysis.trend = 'moderate';
    } else if (savingsRatio > 0.05 && unnecessaryExpenseRatio < 0.45) {
      analysis.trend = 'concerning';
    } else if (savingsRatio > 0.02 && unnecessaryExpenseRatio < 0.5) {
      analysis.trend = 'risky';
    } else if (expenseToIncomeRatio > 1) {
      analysis.trend = 'critical';
    } else {
      analysis.trend = 'unstable';
    }

    // Generate insights and recommendations
    const recommendations = [];
  
    if (analysis.savingsRate < 20) {
      recommendations.push('Considera aumentar tu tasa de ahorro al 20% de tus ingresos');
    }
  
    if (analysis.unnecessaryExpenses > analysis.necessaryExpenses * 0.3) {
      recommendations.push('Los gastos no esenciales son elevados, considera reducirlos');
    }
  
    if (analysis.trend === 'declining') {
      recommendations.push('Tu balance está disminuyendo, revisa tus gastos recientes');
    }
  
    analysis.recommendations = recommendations;

    // Render category breakdown if the element exists
    function renderCategoryBreakdown(element, analysis) {
      const sortedCategories = Object.entries(analysis.categoryBreakdown)
        .sort(([, a], [, b]) => b.total - a.total);

      if (sortedCategories.length === 0) {
        // Show default categories when no transactions exist
        const defaultCategories = Object.entries(analysis.categories);
        
        element.innerHTML = `
          <div class="categories-header">
            <h3>Categorías Disponibles</h3>
            <p class="placeholder-text">Comienza a registrar transacciones para ver estadísticas detalladas</p>
          </div>
          <div class="category-list default-categories">
            ${defaultCategories.map(([key, cat]) => `
              <div class="category-item" style="border-left: 4px solid ${cat.color}">
                <div class="category-info">
                  <span class="category-icon">${cat.icon}</span>
                  <div class="category-details">
                    <h4>${cat.name}</h4>
                    <div class="category-stats">
                      <span class="category-placeholder">Sin transacciones</span>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `;
        return;
      }

      // Show categories with transactions
      const categoryList = sortedCategories.map(([categoryKey, data]) => {
        const categoryInfo = analysis.categories[categoryKey];
        const percentage = data.percentage.toFixed(1);
        
        return `
          <div class="category-item" style="border-left: 4px solid ${categoryInfo.color}">
            <div class="category-info">
              <span class="category-icon">${categoryInfo.icon}</span>
              <div class="category-details">
                <h4>${categoryInfo.name}</h4>
                <div class="category-stats">
                  <span class="category-amount">$${formatMoney(data.total)}</span>
                  <span class="category-percentage">${percentage}%</span>
                </div>
              </div>
            </div>
            <div class="progress-container">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%; background: ${categoryInfo.color}"></div>
              </div>
            </div>
          </div>
        `;
      }).join('');

      element.innerHTML = `
        <div class="categories-header">
          <h3>Desglose por Categorías</h3>
          <p class="total-expenses">Total de gastos: $${formatMoney(analysis.totalExpenses)}</p>
        </div>
        <div class="category-list">
          ${categoryList}
        </div>
      `;
    }

    if (categoryBreakdownDiv) {
      renderCategoryBreakdown(categoryBreakdownDiv, analysis);
    }

    // Render analysis
    function renderAnalysis(element, analysis) {
      element.innerHTML = `
        <div class="analysis-grid">
          <div class="analysis-item">
            <h4>Resumen General</h4>
            <ul>
              <li>Ingresos Totales: $${formatMoney(analysis.totalIncome)}</li>
              <li>Gastos Totales: $${formatMoney(analysis.totalExpenses)}</li>
              <li>Ahorros Totales: $${formatMoney(analysis.totalSavings)}</li>
              <li>Tasa de Ahorro: ${analysis.savingsRate.toFixed(1)}%</li>
            </ul>
          </div>
          
          <div class="analysis-item">
            <h4>Objetivos</h4>
            <p>Completados: ${analysis.completedGoals}</p>
            <p>Activos: ${analysis.activeGoals}</p>
          </div>

          <div class="analysis-item">
            <h4>Tendencia</h4>
            <p class="${getTrendClass(analysis.trend)}">
              ${getTrendText(analysis.trend)}
            </p>
          </div>
        </div>

        <div class="recommendations">
          <h4>Recomendaciones</h4>
          <ul>
            ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    function getTrendText(trend) {
      const trends = {
        'exceptional': ' Excepcional - ¡Finanzas sobresalientes!',
        'excellent': ' Excelente - Mantén el gran trabajo',
        'improving': ' Mejorando - En el camino correcto',
        'stable': ' Estable - Consistente y balanceado',
        'moderate': ' Moderado - Oportunidad de mejora',
        'concerning': ' Preocupante - Necesita atención',
        'risky': ' Riesgoso - Requiere acción inmediata',
        'critical': ' Crítico - Situación financiera delicada',
        'unstable': ' Inestable - Necesita restructuración urgente'
      };
      
      return trends[trend] || ' Estable';
    }

    function getTrendClass(trend) {
      switch(trend) {
        case 'exceptional':
        case 'excellent':
          return 'positive';
        case 'improving':
          return 'improving';
        case 'stable':
          return 'neutral';
        case 'moderate':
        case 'concerning':
          return 'concerning';
        case 'risky':
        case 'critical':
        case 'unstable':
          return 'negative';
        default:
          return 'neutral';
      }
    }

    if (analysisDiv) {
      renderAnalysis(analysisDiv, analysis);
    }

  } catch (error) {
    console.error('Error in analyzeFinancialBehavior:', error);
  }
}
console.log('Treasury Master Dashboard initialized');

const dashboardConfig = {
  ratesSource: 'data/rates-history.json',
  loansSource: 'data/company-loans-current.json',
  modules: ['rates', 'company-loans', 'recommendation-engine']
};

window.dashboardConfig = dashboardConfig;

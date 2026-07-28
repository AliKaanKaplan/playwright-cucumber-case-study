const config = require('./config/env');

module.exports = {
  default: {
    require: [
      'features/support/**/*.js',
      'features/step_definitions/**/*.js',
    ],
    format: [
      'progress',
      'allure-cucumberjs/reporter:reports/allure-results/.reporter-stream.txt',
      'junit:reports/junit/results.xml',
    ],
    formatOptions: {
      resultsDir: 'reports/allure-results',
      environmentInfo: {
        environment: config.env,
        base_url: config.baseUrl,
        browser: `${config.browser} (Playwright)`,
        headless: String(config.headless),
        parallel_workers: String(config.workers),
        os: process.platform,
        node: process.version,
      },
    },
    parallel: config.workers,
  },
};

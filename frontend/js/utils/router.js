/* ============================================================
   LabWise — router.js
   Simple page-navigation helpers so every JS file uses
   consistent redirect targets.
   ============================================================ */

const Router = (() => {

  function goTo(page) { window.location.href = page; }

  const go = {
    login:            () => goTo('login.html'),
    signup:           () => goTo('signup.html'),
    verify:           () => goTo('verify.html'),
    forgotPassword:   () => goTo('forgot-password.html'),
    dashboard:        () => goTo('dashboard.html'),
    experiments:      () => goTo('experiments.html'),
    createExperiment: () => goTo('create-experiment.html'),
    results:          () => goTo('results.html'),
    account:          () => goTo('account.html'),
    settings:         () => goTo('settings.html'),
    upgrade:          () => goTo('upgrade.html'),
    lab:              () => goTo('lab.html'),
    graph:            () => goTo('graph.html'),
    report:           () => goTo('report.html'),
    landing:          () => goTo('index.html'),
  };

  return { goTo, ...go };

})();

'use strict';

function formatReport(report) {
  return JSON.stringify(report, null, 2);
}

module.exports = { formatReport };

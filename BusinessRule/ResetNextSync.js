(function executeRule(current, previous /*null when async*/) {
  var case_ref = new GlideRecord(gs.getCurrentScopeName()+'_support_cases');
  case_ref.addQuery('incident','=', current.sys_id);
  case_ref.addQuery('status','!=', 'closed');
  case_ref.query();
  if (case_ref.hasNext()) {
    case_ref.next();
    case_ref.next_sync = 30000;
    case_ref.update();
  }
})(current, previous);
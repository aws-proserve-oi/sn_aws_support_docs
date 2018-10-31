var ScopedImpersonator = Class.create();
ScopedImpersonator.prototype = {
    initialize: function(){},
    impersonate_aws_user: function() {
    var user = new GlideRecord('sys_user');
    user.addQuery('user_name', gs.getProperty("x_195647_aws_.Config.AWS.username"));
    user.query();
    if (user.hasNext()) {
      user.next();
      gs.info("impersonating " + user.user_name);
      return gs.getSession().impersonate(user.sys_id);
    }
    },

    type: 'ScopedImpersonator'
};
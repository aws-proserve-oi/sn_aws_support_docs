var ScopedImpersonator = Class.create();
ScopedImpersonator.prototype = {
    initialize: function(){},
    impersonate: function(user) {
      return gs.getSession().impersonate(user);
    },

    type: 'ScopedImpersonator'
};
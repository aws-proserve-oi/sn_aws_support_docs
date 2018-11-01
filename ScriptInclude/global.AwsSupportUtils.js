var AwsSupportUtils = Class.create();
AwsSupportUtils.prototype = {
    initialize: function() {
        this.aws_user_name = gs.getProperty("x_195647_aws_.Config.AWS.username");
        var gr = new GlideRecord('sys_user');
        gr.addQuery('user_name', this.aws_user_name);
        gr.query();
        if (!gr.hasNext()) { throw "AWS Support user account is not setup.";}
        gr.next();
        this.aws_user = gr;
    },

    setJournalEntry: function(incident, object, user) {
      var originalUser = gs.getSession().impersonate(this.aws_user.sys_id);
      incident.comments.setJournalEntry(object, user);
      incident.update();
      gs.getSession().impersonate(originalUser);
    },

    type: 'AwsSupportUtils'
};

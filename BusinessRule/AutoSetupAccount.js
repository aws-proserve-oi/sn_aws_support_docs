(function executeRule(current) {
    //1 - find or create AWS user
    //2 - find or create Account assignment group
    //3 - Add user to group
    //4 - relate Group to account

    gs.info("RUN - Auto account setup for " + current.name);
    var assignment_user = (function find_or_create_AWS_user() {
        if (gs.getProperty("x_195647_aws_.Config.AWS.username")) {
            var sys_user = new GlideRecord('sys_user');
            sys_user.addQuery('user_name','=', gs.getProperty("x_195647_aws_.Config.AWS.username"));
            sys_user.query();
            if (sys_user.next()) {
                gs.info("Found existing AWS user id:" + sys_user.name);
                return sys_user;
            } else {
                var new_user = new GlideRecord('sys_user');
                new_user.initialize();
                new_user.name = 'Amazon Web Services';
                new_user.user_name = gs.getProperty("x_195647_aws_.Config.AWS.username");
                new_user.internal_integration_user = true;
                new_user.active = false;
                new_user.insert();
                gs.info("Created assignment user " + new_user.name );
                return new_user;
            }
        } else {
            return false
        }
    })();

    var assignment_group = (function find_or_create_AWS_account_group() {
        if (current.assignment_group) {
            return current.assignment_group;
        } else {
            var group = new GlideRecord('sys_user_group');
            group.addQuery('name','=', 'AWS-' + current.name);
            group.query();
            if (group.next()) {
                gs.info("Found existing AWS assingment group for this account " + current.name);
                return group;
            } else {
                var new_group = new GlideRecord('sys_user_group');
                new_group.initialize();
                new_group.name = 'AWS-' + current.name;
                new_group.insert();
                gs.info("Created assignment group " + new_group.name + " for AWS account: " + current.name );
                return new_group;
            }

        }
    })();
    
    if (assignment_user) {
        var group_membership = (function function_name() {
            var grmember = new GlideRecord('sys_user_grmember');
            grmember.addQuery('group','=', current.assignment_group.sys_id);
            grmember.addQuery('user','=', assignment_user.sys_id);
            grmember.query();
            if (grmember.next()) {
                gs.info("User " + assignment_user.name + " already belongs to group " + current.assignment_group.name);
                return grmember;
            } else {
                var new_grmember = new GlideRecord('sys_user_grmember');
                new_grmember.initialize();
                new_grmember.user = assignment_user.sys_id;
                new_grmember.group = current.assignment_group.sys_id;
                new_grmember.insert();
                gs.info("User " + assignment_user.name + " was added to group " + current.assignment_group.name);
                return new_grmember;
            }
        })();
    }

    current.assignment_group = assignment_group.sys_id;
    current.auto_setup = false;
    current.update();

})(current);
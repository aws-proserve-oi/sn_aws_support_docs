gs.include('SupportApi');

function insertChoice(choice, parent) {
    var choice = new GlideRecord('sys_choice');
    choice.initialize(); 
    choice.short_description = aws_case.subject;
    choice.description = aws_case.recentCommunications.communications[0].body;
    choice.caller_id = aws_account.assignment_user;
    choice.insert();
    
    return choice;    
}

function insertServiceChoices(service, parent) {
    var choices = []
    var 
    for 

    return choices;
}

(function() {
    var aws_account = new GlideRecord('x_195647_aws__accounts');
    aws_account.addQuery('active', 'true');
    //aws_account.addQuery('aws_api_key','!=', '');
    //aws_account.addQuery('secret_access_key','!=', '');
    aws_account.query();
    if (!aws_account.hasNext()) { 
        gs.error("Error importing AWS Support Codes, one AWS account must be configured & active");
        return false;
    }

    aws_account.next();
    var creds = {
        accessKeyId: String(aws_account.aws_api_key),
        secretAccessKey: aws_account.aws_secret_key.getDecryptedValue()
    };

    AWSApi = new SupportApi(creds);
    var services = AWSApi.describeServices();
    gs.info("Services: " + JSON.stringify(services));

    //create main category choice: AWS Support Case

    var choice = {
        label: "AWS Support Case",
        value: "aws_support_case",
        element: "category",
        language: "en",
        inactive: false,
        sequence: 90
    };
    var incident_category = insertChoice(choice);

    for (var s in services) {
        var choices = insertServiceChoices(services[s], incident_category);
        gs.info("Added Service: " + services[s].name);
    }


    // iterate first AWS account
    // Get AWS Support Codes & Categories
    // Iterate per code
        // Create service code
        // iterate service's categories
            // create category choices

})();
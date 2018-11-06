gs.include("AwsSupportApi");

function insertServiceChoices(service) {
    gs.info("SERVICE " + JSON.stringify(service));
    var service_choice = insertChoice(service, "x_195647_aws__service_code");
    for (var c in service["categories"]) {
        var category_choice = insertChoice(service["categories"][c], "x_195647_aws__service_category", service["code"]);
    }
}

function insertChoice(object, element, dependent_value) {
    var choice = new GlideRecord("sys_choice");
    choice.addQuery("element", element);
    if (dependent_value) {
        choice.addQuery("dependent_value", dependent_value);
    }
    choice.addQuery("value", object["code"]);
    choice.query();
    if (choice.hasNext()) {
        choice.next();
    } else {
        choice.initialize();
    }
    choice.inactive= false;
    choice.value   = object["code"];
    choice.label   = object["name"];
    choice.element = element;
    choice.name   = 'incident';
    if (dependent_value) {
        choice.dependent_value = dependent_value;
    }
    choice.update();
    gs.info('inserted choice ' + choice.sys_id + ' ' + choice.value + " " + choice.dependent_value);
}

(function() {
    var aws_account = new GlideRecord("x_195647_aws__accounts");
    aws_account.addQuery("active", "true");
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

    AWSApi = new AwsSupportApi(creds);
    var services = AWSApi.describeServices();
    //gs.info("Services: " + JSON.stringify(services));

    /*{
        "code": "comprehend", 
        "name": "Comprehend", 
        "categories": [
            {
                "code": "other", 
                "name": "Other"
            }, 
            {
                "code": "feature-request", 
                "name": "Feature Request"
            }, 
            {
                "code": "api", 
                "name": "API"
            }, 
            {
                "code": "general-guidance", 
                "name": "General Guidance"
            }
        ]
    },*/ 

    for (var s in services) {
        insertServiceChoices(services[s]);
        gs.info("Added Service: " + services[s].name);
    }
})();
const nodeFetch = require('node-fetch');
const fs = require('fs');
const changeCase = require('change-case');

const cfDefinitionSource = "https://d3teyb21fexa9r.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json";

let generatedSnippets = {};

function generatePropertyComments(propertyData) {
    let propertyComments = [];

    if (propertyData['DuplicatesAllowed'] == true) { propertyComments.push("Can have duplicates") }
    if (propertyData['UpdateType'] == "Immutable") { propertyComments.push("Change triggers replacement") }

    return propertyComments;
}

// Add snippet for Halloumi environment property
generatedSnippets["Halloumi_environment_property"] = {
    "prefix": "Halloumi environment property",
    "body": [
        "property :property_name,",
        "         env: :ENVIRONMENT_VARIABLE_NAME,",
        "         required: true,",
        "         default: \"<default value>\""
    ],
    "description": `An Halloumi property using a value from your .env.* files`
}

// Add snippet for Halloumi template property
generatedSnippets["Halloumi_template_property"] = {
    "prefix": "Halloumi template property",
    "body": [
        "property :property_name,",
        "         env: :ENVIRONMENT_VARIABLE_NAME,",
        "         template: File.expand_path(",
        "           \"<relative path to template>\"",
        "           __FILE__",
        "         ),",
        "         required: true",
    ],
    "description": `An Halloumi property using a template to load it's value`
}

// Add snippet for output
generatedSnippets["Halloumi_output"] = {
    "prefix": "Halloumi output",
    "body": ["output(:resource_name, :output_name) { |r| ... }"],
    "description": `An Halloumi resource output`
}

// Add snippet for virtual resource
generatedSnippets["Halloumi_VirtualResource"] = {
    "prefix": "VirtualResource",
    "body": [
        "# @!attribute [rw] virtual_resources",
        "# @return [Array<Halloumi::VirtualResource>] Virtual Resource",
        "resource :virtual_resources,",
        "         type: Halloumi::VirtualResource do |r|",
        "",
        "\tr.parameter { ... } # to be able to +Ref+ the value of a CloudFormation template parameter",
        "\tr.ref { ... } # to be able to imitate referencing a resource ",
        "\tr.property { ... } # to define properties on the virtual resource",
        "end"
    ],
    "description": `An Halloumi virtual resource`
}

nodeFetch(cfDefinitionSource)
    .then(res => res.json())
    .then(json =>{
        for (let resourceType in json['ResourceTypes']) {
            let snippetBody = [];
            let pIndex = 0;

            snippetBody.push("# @!attribute [rw] " + changeCase.snakeCase(resourceType) + "s");
            snippetBody.push("# @return [Array<Halloumi::" + resourceType + ">] " + changeCase.snakeCase(resourceType) + "s");
            snippetBody.push("# @see: " + json['ResourceTypes'][resourceType]["Documentation"]);
            snippetBody.push("resource :" + changeCase.snakeCase(resourceType) + "s,");
            snippetBody.push("         type: Halloumi::" + resourceType + ",");
            snippetBody.push("         amount: -> { amount } do |r|\n");

            let requiredProperties = {};
            let otherProperties = {};

            for (let resourceParameter in json['ResourceTypes'][resourceType]['Properties']) {
                let propertyData = json['ResourceTypes'][resourceType]['Properties'][resourceParameter];

                if (propertyData['Required'] === true) {
                    requiredProperties[resourceParameter] = propertyData;
                } else {
                    otherProperties[resourceParameter] = propertyData;
                }
            }

            if (Object.keys(requiredProperties).length > 0) {
                snippetBody.push("\t# Required properties")

                for (let resourceParameter in requiredProperties) {
                    let c = generatePropertyComments(requiredProperties[resourceParameter]);
                    let s = "\tr.property(:" + changeCase.snakeCase(resourceParameter).toLowerCase() + ") { ... }"
                    
                    if (c.length > 0) { s += ` # ${c.join(' / ')}` }
                    snippetBody.push(s);
                }

                snippetBody.push("")
            }

            if (Object.keys(requiredProperties).length > 0) {
                snippetBody.push("\t# Other properties")

                for (let resourceParameter in otherProperties) {
                    let c = generatePropertyComments(otherProperties[resourceParameter]);
                    let s = "\tr.property(:" + changeCase.snakeCase(resourceParameter).toLowerCase() + ") { ... }"
                    
                    if (c.length > 0) { s += ` # ${c.join(' / ')}` }
                    snippetBody.push(s);
                }
            }
            snippetBody.push("end")

            generatedSnippets[`Halloumi_${resourceType}`] = {
                "prefix": resourceType.replace('AWS::', ''),
                "body": snippetBody,
                "description": `The ${resourceType} basic resource`
            }
        }

        fs.writeFile("snippets/snippets.json", JSON.stringify(generatedSnippets), function(err) {
            if (err) {
                return console.log(err);
            }
            console.log(`Wrote ${Object.keys(generatedSnippets).length} snippets to file`)
        });
    });
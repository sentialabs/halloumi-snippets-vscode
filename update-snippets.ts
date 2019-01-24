const nodeFetch = require('node-fetch');
const fs = require('fs');
const changeCase = require('change-case');

const cfDefinitionSource = "https://d3teyb21fexa9r.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json";

let generatedSnippets = {};

function generatePropertyComments(propertyData) {
    let propertyComments = [];

    if (propertyData['UpdateType'] == "Immutable") { propertyComments.push("Change triggers replacement") }
    if (propertyData['UpdateType'] == "Conditional") { propertyComments.push("Change might trigger replacement") }

    return propertyComments;
}

function generatePrimitiveDataTypeExample(primitiveType) {
    let snippet = "";

    if (primitiveType == "String" ) { 
        snippet = "\"string\"";
    } else if (primitiveType == "Long" ) { 
        snippet = "long";
    } else if (primitiveType == "Integer" ) { 
        snippet = "integer";
    } else if (primitiveType == "Double" ) { 
        snippet = "double";
    } else if (primitiveType == "Boolean" ) { 
        snippet = "true|false";
    } else if (primitiveType == "Timestamp" ) { 
        snippet = "\"YYYYMMDD'T'HHMMSS\"";
    } else if (primitiveType == "Json" ) { 
        snippet = "json";
    }

    return snippet;
}

function generatePropertyDataType(propertyData) {
    let dataType = "{ ... }";
    let s = "";
    
    if (propertyData["PrimitiveType"]) {
        dataType = `{ ${generatePrimitiveDataTypeExample(propertyData["PrimitiveType"])} }`;
    } else if (propertyData["Type"]) {
        if (propertyData["Type"] == "List" ) {
            if (propertyData["PrimitiveItemType"]) {
                s = generatePrimitiveDataTypeExample(propertyData["PrimitiveItemType"]);
            } else if (propertyData["ItemType"]) {
                s = propertyData["ItemType"];
            }
            dataType = `do\n\t\t[\n\t\t\t${s},\n\t\t\t${s},\n\t\t\t...\n\t\t]\n\tend`;
        } else if (propertyData["Type"] == "Map" ) { 
            if (propertyData["PrimitiveItemType"]) {
                s = generatePrimitiveDataTypeExample(propertyData["PrimitiveItemType"]);
            } else if (propertyData["ItemType"]) {
                s = propertyData["ItemType"];
            }
            dataType = `do\n\t\t{\n\t\t\t${s}: ${s},\n\t\t\t${s}: ${s},\n\t\t\t...\n\t\t}\n\tend`;
        } else {
            dataType = `{ ${propertyData["Type"]} }`;
        }
    }

    return dataType;
}

// Add snippet for Halloumi environment property
generatedSnippets["Halloumi_environment_property"] = {
    "prefix": "Halloumi environment property",
    "body": [
        "property :property_name,",
        "         env: :ENVIRONMENT_VARIABLE_NAME,",
        "         required: true,",
        "         filter: :optional_filter,",
        "         default: \"<default value>\"\n"
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
        "         required: true\n",
    ],
    "description": `An Halloumi property using a template to load it's value`
}

// Add snippet for output
generatedSnippets["Halloumi_output"] = {
    "prefix": "Halloumi output",
    "body": ["output(:resource_name, :output_name) { |r| ... }\n"],
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
        "end\n"
    ],
    "description": `An Halloumi virtual resource`
}

nodeFetch(cfDefinitionSource)
    .then(res => res.json())
    .then(json =>{
        for (let resourceType in json['ResourceTypes']) {
            let snippetBody = [];
            let pIndex = 0;

            snippetBody.push("# @see: " + json['ResourceTypes'][resourceType]["Documentation"]);
            snippetBody.push("resource :" + changeCase.snakeCase(resourceType) + "s,");
            snippetBody.push("         type: Halloumi::" + resourceType + ",");
            snippetBody.push("         amount: -> { amount } do |r|\n");

            let requiredProperties = {};
            let optionalProperties = {};

            for (let resourceParameter in json['ResourceTypes'][resourceType]['Properties']) {
                let propertyData = json['ResourceTypes'][resourceType]['Properties'][resourceParameter];

                if (propertyData['Required'] === true) {
                    requiredProperties[resourceParameter] = propertyData;
                } else {
                    optionalProperties[resourceParameter] = propertyData;
                }
            }

            if (Object.keys(requiredProperties).length > 0) {
                snippetBody.push("\t# Required properties")

                for (let resourceParameter in requiredProperties) {
                    let c = generatePropertyComments(requiredProperties[resourceParameter]);
                    let s = "\tr.property(:" + changeCase.snakeCase(resourceParameter).toLowerCase() +
                        ") " + generatePropertyDataType(requiredProperties[resourceParameter])
                    
                    if (c.length > 0) { s += ` # ${c.join(' / ')}` }
                    snippetBody.push(s);
                }

                snippetBody.push("")
            }

            if (Object.keys(optionalProperties).length > 0) {
                snippetBody.push("\t# Optional properties")

                for (let resourceParameter in optionalProperties) {
                    let c = generatePropertyComments(optionalProperties[resourceParameter]);
                    let s = "\tr.property(:" + changeCase.snakeCase(resourceParameter).toLowerCase() +
                        ") " + generatePropertyDataType(optionalProperties[resourceParameter])
                    
                    if (c.length > 0) { s += ` # ${c.join(' / ')}` }
                    snippetBody.push(s);
                }
            }
            snippetBody.push("end\n\n");

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
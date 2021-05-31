"use strict"

// closing of the session and the driver? 

// Neo4j DB
const session2 = driver.session() // Create new session for simultaneous running of sessions.
var modified_json = {}
var modified_doc_json = {}

function truncateString(str, num) {
    // If the length of str is less than or equal to num
    // just return str -- don't truncate it.
    if (str.length <= num) {
        return str
    }
    // Return str truncated with '...' concatenated to the end of str.
    return str.slice(0, num) + '...'
}

async function expandDocNode(docid) {
    try {
        await session2.run("MATCH (d:Document{DocID: $docid})-[r]->(n) WITH COLLECT(n) as a, COLLECT(r) as b CALL apoc.export.json.data(a, b, '../../../../../../xampp/htdocs/user_preferences/assets/doc_data.json', {jsonFormat:'JSON'}) YIELD file, source, format, nodes, relationships, properties, time, rows, batchSize, batches, done, data RETURN file, source, format, nodes, relationships, properties, time, rows, batchSize, batches, done, data", { docid: docid })
            .catch(error => {
                console.log(error)
            })
    } finally {
        await $.getJSON("../assets/doc_data.json", function (json) {
            json.nodes.forEach(obj => {
                if (obj.labels[0] == 'Topic') {
                    [...Array(obj.properties.words.length).keys()].forEach(i => {
                        console.log(i) // construct word function 
                    })
                    //obj.properties['Word Function'] = obj.properties['num_docs']
                    delete obj.properties['name']
                    //delete obj.properties['source_score']
                }
            })

            /*json.rels.forEach(obj => {
                obj.type = obj.label
                delete obj.label

                obj.startNode = obj.start.id
                delete obj.start
                obj.endNode = obj.end.id
                delete obj.end
            });*/
            modified_doc_json = json;
        });
    }
}

const init = async function () {
    try {
        await session2.run("MATCH (u:User{UserID:$userid})-[r:READ]->(d:Document) WITH COLLECT(distinct(u))+COLLECT(d) as a, COLLECT(r) as b CALL apoc.export.json.data(a, b, '../../../../../../xampp/htdocs/user_preferences/assets/user_data.json', {jsonFormat:'JSON'}) YIELD file, source, format, nodes, relationships, properties, time, rows, batchSize, batches, done, data RETURN file, source, format, nodes, relationships, properties, time, rows, batchSize, batches, done, data", { userid: userid }) // By default exports to neo4j relate-data dmbs
            .catch(error => {
                console.log(error)
            })
    } finally {
        // Get the JSON file from path, parse it into an object, modify the object to desired format.
        await $.getJSON("../assets/user_data.json", function (json) {
            json.nodes.forEach(obj => {
                if (obj.labels[0] == 'User') {
                    obj.properties['Number of Docs Read'] = obj.properties['num_docs']
                    delete obj.properties['num_docs']
                    delete obj.properties['source_score']
                }

                if (obj.labels[0] == 'Document') {
                    obj.properties['Text'] = truncateString(obj.properties['text'].replace(/\\/g, ''), 500)
                    delete obj.properties['text']
                    delete obj.properties['bbc_cat']
                }
            })

            json.rels.forEach(obj => {
                obj.type = obj.label
                delete obj.label

                obj.startNode = obj.start.id
                delete obj.start
                obj.endNode = obj.end.id
                delete obj.end
            });
            modified_json = {
                "results": [
                    {
                        "columns": [
                            "user",
                            "document"
                        ],
                        "data": [{}]
                    }
                ]
            }
            modified_json.results[0].data[0].graph = json;
        });
        // console.log(JSON.stringify(modified_json))
        var neo4jd3 = new Neo4jd3('#neo4jd3', {
            highlight: [ // highlighted nodes
                {
                    class: 'User',
                    property: 'UserID',
                    value: userid
                }
            ],
            icons: {
                'Document': 'file', // Project
                'User': 'user',
            },
            images: {
                'Document': '../neo4jd3/docs/img/twemoji/2198.svg', // Project
                'User': '../neo4jd3/docs/img/twemoji/1f600.svg'
            },
            minCollision: 60,
            neo4jData: modified_json,
            nodeRadius: 25,
            // If possible, allow for some kind of a search? 
            // Preloader? --> Ctrl-shift-f justLoaded
            // onNodeDoubleClick show/hide HAS_TOPIC and HAS_ENTITY?
            onNodeDoubleClick: function (node) {
                if (node.labels[0] == "Document") {
                    if (!node.hasOwnProperty("Expanded") || !node["Expanded"]) {
                        node["Expanded"] = true
                        neo4jd3.updateWithD3Data(node)
                        expandDocNode(node.properties.DocID)
                    } else {
                        node["Expanded"] = false
                        neo4jd3.updateWithD3Data(node)
                    }
                }
                /*switch (node.id) {
                    case '25':
                        // Google
                        window.open(node.properties.url, '_blank');
                        break;
                    default:
                        var maxNodes = 5,
                            data = neo4jd3.randomD3Data(node, maxNodes);
                            console.log(data)
                        neo4jd3.updateWithD3Data(data);
                        break;
                }*/
            },
            /*onRelationshipDoubleClick: function (relationship) {
                console.log('double click on relationship: ' + JSON.stringify(relationship));
            },*/
            zoomFit: true
        });
    }
}

init()

/*(function (i, s, o, g, r, a, m) {
    i['GoogleAnalyticsObject'] = r; i[r] = i[r] || function () {
        (i[r].q = i[r].q || []).push(arguments)
    }, i[r].l = 1 * new Date(); a = s.createElement(o),
        m = s.getElementsByTagName(o)[0]; a.async = 1; a.src = g; m.parentNode.insertBefore(a, m)
})(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');

ga('create', 'UA-430863-29', 'auto');
ga('send', 'pageview');*/
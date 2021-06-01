"use strict"

// closing of the session and the driver? 
// allow the searching of nodes?
// restarting the neo4j graph after various expansions? 

// Neo4j DB
const session2 = driver.session() // Create new session for simultaneous running of sessions.
var modified_json = {}
var modified_doc_json = {}
var topics_and_entities = []

function truncateString(str, num) {
    // If the length of str is less than or equal to num, just return str -- don't truncate it.
    if (str.length <= num) {
        return str
    }
    // Return str truncated with '...' concatenated to the end of str.
    return str.slice(0, num) + '...'
}

async function expandDocNode(docid) {
    try {
        await session2.run("MATCH (d:Document{DocID: $docid})-[r]->(n) WHERE NOT 'User' in labels(n) WITH COLLECT(n) as a, COLLECT(r) as b CALL apoc.export.json.data(a, b, '../../../../../../xampp/htdocs/user_preferences/assets/doc_data.json', {jsonFormat:'JSON'}) YIELD file, source, format, nodes, relationships, properties, time, rows, batchSize, batches, done, data RETURN file, source, format, nodes, relationships, properties, time, rows, batchSize, batches, done, data", { docid: docid })
            .catch(error => {
                console.log(error)
            })
    } finally {
        await $.getJSON("../assets/doc_data.json", function (json) {
            var final_json = { "nodes": [], "rels": [] }
            json.nodes.forEach(obj => {
                // To not recreate existing nodes, need to check if node's id is already present. 
                if (topics_and_entities.indexOf(obj.id) == -1) {
                    if (obj.labels[0] == 'Topic') {
                        var word_function = "";
                        var words_len = obj.properties.words.length;
                        [...Array(words_len).keys()].forEach(i => {
                            word_function += (Number(obj.properties.word_weights[i].toPrecision(3)) + "*" + obj.properties.words[i]) // construct word function
                            if (i != words_len - 1) word_function += " + "
                        })
                        obj.properties['Word Function'] = word_function
                        delete obj.properties['name']
                        delete obj.properties['words']
                        delete obj.properties['word_weights']
                    }
                    final_json.nodes.push(obj)
                    topics_and_entities.push(obj.id)
                }
            })

            json.rels.forEach(obj => {
                obj.type = obj.label
                delete obj.label

                obj.startNode = obj.start.id
                delete obj.start
                obj.endNode = obj.end.id
                delete obj.end

                final_json.rels.push(obj)
            });
            modified_doc_json = {
                "results": [
                    {
                        "columns": [
                            "topic",
                            "entity"
                        ],
                        "data": [{}]
                    }
                ]
            }
            modified_doc_json.results[0].data[0].graph = final_json;
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
                'Document': 'file-text',
                'User': 'user',
                'Topic': 'folder',
                'Entity': 'bank'
            },
            images: {
                'User': '../neo4jd3/docs/img/twemoji/1f600.svg'
            },
            minCollision: 60,
            neo4jData: modified_json,
            nodeRadius: 25, 
            onNodeDoubleClick: async function (node) {
                if (node.labels[0] == "Document") {
                    if (!node.hasOwnProperty("Expanded") || !node["Expanded"]) {
                        neo4jd3.updateWithD3Data(node)
                        await expandDocNode(node.properties.DocID)
                        neo4jd3.updateWithNeo4jData(modified_doc_json)
                        node["Expanded"] = true
                    } // Currently can't hide the nodes on a second double-click
                }
            },
            zoomFit: true
        });
    }
}

function resetGraph() {
    document.getElementById("neo4jd3").innerHTML = ""
    init()
}

init()
"use strict"

// Neo4j DB
const session2 = driver.session() // Create new session for simultaneous running of sessions.
var modified_json = {}
var modified_doc_json = {}
var topics_and_entities = []
var expandedDoc = false

// JS involving the Search Function --> include an error message if search is invalid; or can look up validation!
const search_opt = ['Search by DocID', 'Search by Entity Name', 'Search by TopicID']
var curr_search = "0"
var curr_input = ""
const search_btn = document.getElementById("search_btn")
const dropdown1 = document.getElementById("dropdown-1")
const dropdown2 = document.getElementById("dropdown-2")
const search_input = document.getElementById("search_input")

function updateCurrSearch() {
    search_btn.innerHTML = search_opt[curr_search] // Array index can be in string format.
    search_btn.value = curr_search
    switch (curr_search) {
        case "0": // DocID
            dropdown1.innerHTML = search_opt[1]
            dropdown1.value = "1" // Note that value needs to be a string.
            dropdown2.innerHTML = search_opt[2]
            dropdown2.value = "2"
            break
        case "1": // Entity Name
            dropdown1.innerHTML = search_opt[0]
            dropdown1.value = "0"
            dropdown2.innerHTML = search_opt[2]
            dropdown2.value = "2"
            break
        case "2": // TopicID
            dropdown1.innerHTML = search_opt[0]
            dropdown1.value = "0"
            dropdown2.innerHTML = search_opt[1]
            dropdown2.value = "1"
            break
    }
}

updateCurrSearch()

function changeSearch(num) {
    switch (num) {
        case 1: // From dropdown-1
            curr_search = dropdown1.value
            break
        case 2: // From dropdown-2
            curr_search = dropdown2.value
            break
    }
    updateCurrSearch()
}

async function updateGraph(inp, search_mtd) {
    try {
        switch (search_mtd) {
            case "0":
                inp = parseInt(inp)
                await session2.run("MATCH (u:User{UserID:$userid})-[:READ]->(d:Document{DocID: $inp})-[r]->(n) WHERE NOT 'User' in labels(n) WITH [d]+COLLECT(n) as a, COLLECT(r) as b CALL apoc.export.json.data(a, b, '../../../../../../xampp/htdocs/user_preferences/assets/user_data.json', {jsonFormat:'JSON'}) YIELD file, source, format, nodes, relationships, properties, time, rows, batchSize, batches, done, data RETURN file, source, format, nodes, relationships, properties, time, rows, batchSize, batches, done, data", { userid: userid, inp: inp }) // By default exports to neo4j relate-data dmbs
                    .catch(error => {
                        console.log(error)
                    })
                break

            case "1":
                await session2.run("MATCH (e:Entity{Name:$inp})-[r:ENTITY_WITHIN]->(d:Document)-[:READ_BY]->(u:User{UserID:$userid}) WITH [e]+COLLECT(d) as a, COLLECT(r) as b CALL apoc.export.json.data(a, b, '../../../../../../xampp/htdocs/user_preferences/assets/user_data.json', {jsonFormat:'JSON'}) YIELD file, source, format, nodes, relationships, properties, time, rows, batchSize, batches, done, data RETURN file, source, format, nodes, relationships, properties, time, rows, batchSize, batches, done, data", { userid: userid, inp: inp }) // By default exports to neo4j relate-data dmbs
                    .catch(error => {
                        console.log(error)
                    })
                break

            case "2":
                inp = parseInt(inp)
                await session2.run("MATCH (t:Topic{TopicID:$inp})-[r:TOPIC_WITHIN]->(d:Document)-[:READ_BY]->(u:User{UserID:$userid}) WITH [t]+COLLECT(d) as a, COLLECT(r) as b CALL apoc.export.json.data(a, b, '../../../../../../xampp/htdocs/user_preferences/assets/user_data.json', {jsonFormat:'JSON'}) YIELD file, source, format, nodes, relationships, properties, time, rows, batchSize, batches, done, data RETURN file, source, format, nodes, relationships, properties, time, rows, batchSize, batches, done, data", { userid: userid, inp: inp }) // By default exports to neo4j relate-data dmbs
                    .catch(error => {
                        console.log(error)
                    })
                break
        }
    } finally {
        // Get the JSON file from path, parse it into an object, modify the object to desired format.
        await $.getJSON("../assets/user_data.json", function (json) {
            json.nodes.forEach(obj => {
                if (obj.labels[0] == 'Document') {
                    obj.properties['Text'] = truncateString(obj.properties['text'].replace(/\\/g, ''), 400)
                    delete obj.properties['text']
                    delete obj.properties['bbc_cat']
                }

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
                            "document",
                            "topic",
                            "entity"
                        ],
                        "data": [{}]
                    }
                ]
            }
            modified_json.results[0].data[0].graph = json;
        });
        // console.log(JSON.stringify(modified_json))
        var neo4jd3 = new Neo4jd3('#neo4jd3', {
            icons: {
                'Document': 'file-text',
                'Topic': 'folder',
                'Entity': 'bank'
            },
            minCollision: 60,
            neo4jData: modified_json,
            nodeRadius: 25,
            zoomFit: true
        });
    }
}

function submitSearch() {
    curr_input = search_input.value
    document.getElementById("neo4jd3").innerHTML = ""
    updateGraph(curr_input, curr_search)
}

// Other Functions
function truncateString(str, num) {
    // If the length of str is less than or equal to num, just return str -- don't truncate it.
    if (str.length <= num) {
        return str
    }
    // Return str truncated with '...' concatenated to the end of str.
    return str.slice(0, num) + '...'
}

async function expandDocNode(docid) {
    // When expanded and graph is resetted, doc nodes can no longer be expanded. --> BUG
    // This function still works, but seemingly a problem with updating the graph :(
    // Currently, just avoiding the issue by disallowing double clicking when doc nodes are expanded and graph is resetted.
    // Refreshing the page would also 'resolve' the issue. 
    // Perhaps due to storage or cache used when updating graph. 
    expandedDoc = true
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
                            "document",
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
                    if (obj.properties['disliked_tops'].length != 0) obj.properties['Disliked Topics'] = obj.properties['disliked_tops']
                    if (obj.properties['disliked_ents'].length != 0) obj.properties['Disliked Entities'] = obj.properties['disliked_ents']
                    if (obj.properties['liked_tops'].length != 0) obj.properties['Liked Topics'] = obj.properties['liked_tops']
                    if (obj.properties['liked_ents'].length != 0) obj.properties['Liked Entities'] = obj.properties['liked_ents']
                    delete obj.properties['num_docs']
                    delete obj.properties['source_score']
                    delete obj.properties['disliked_tops']
                    delete obj.properties['disliked_ents']
                    delete obj.properties['liked_tops']
                    delete obj.properties['liked_ents']
                }

                if (obj.labels[0] == 'Document') {
                    obj.properties['Text'] = truncateString(obj.properties['text'].replace(/\\/g, ''), 400)
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
        if (!expandedDoc) {
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
        } else {
            var neo4jd3_new = new Neo4jd3('#neo4jd3', {
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
                /*onNodeDoubleClick: async function (node) {
                    if (node.labels[0] == "Document") {
                        if (!node.hasOwnProperty("Expanded") || !node["Expanded"]) {
                            neo4jd3_new.updateWithD3Data(node)
                            await expandDocNode(node.properties.DocID)
                            neo4jd3_new.updateWithNeo4jData(modified_doc_json)
                            node["Expanded"] = true
                        } // Currently can't hide the nodes on a second double-click
                    }
                },*/
                zoomFit: true
            });
        }
    }
}

function resetGraph() {
    document.getElementById("neo4jd3").innerHTML = ""
    init()
}

init()
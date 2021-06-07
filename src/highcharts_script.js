"use strict"
// Neo4j DB
const session = driver.session()
const top_topics = {} // topics and their words
const top_entities = {} // entity names; using object here to store the count of docs containing each entity later.
/* need to add the liked topics or entities here so that they won't appear in the suggestions again */
const suggested_topics = []
const suggested_entities = []
var overall_data = []
var overall_data2 = [{ name: 'Entity Proportion', colorByPoint: true }]

// Can add side labels for entities in pie chart
// Can animate the next and prev button to show 'To Topics' and 'To Entities' hahaha
// Scrollspy? 

const start = async function (userid) {
    try {
        document.getElementById("preloader").style.display = 'block'
        document.getElementById("preloader2").style.display = 'block'
        var graph_exists = null
        await session.run("CALL gds.graph.exists('bbc_recs') YIELD exists").then(result => graph_exists = result.records[0].get('exists')) // Returns boolean

        if (!graph_exists) {
            // Creating Cypher graph
            await session.run("CALL gds.graph.create.cypher('bbc_recs','MATCH (n) RETURN id(n) AS id','MATCH (s)-[r]->(t) RETURN id(s) AS source, id(t) AS target, COALESCE(r.weight,2) AS weight') YIELD graphName RETURN null")
        }
        await session.run(
            // Pagerank score threshold being 5 when looking at Top Topics to be shown -- can be adjusted
            'MATCH (u:User{UserID:$userid}), (n) WHERE (n.TopicID IN u.liked_tops OR n.Name+" ("+labels(n)[1..][0]+")" IN u.liked_ents) AND NOT (u)-[:READ]->()-[:HAS_ENTITY|:HAS_TOPIC]->(n) WITH COLLECT(n) AS likes MATCH (u:User{UserID:5}) CALL gds.pageRank.stream("bbc_recs",{maxIterations: 100, dampingFactor: 0.85, sourceNodes:[u]+likes, relationshipWeightProperty: "weight"}) YIELD nodeId, score WITH gds.util.asNode(nodeId) as n, (score/u.source_score)*100 as score WHERE "Topic" in labels(n) AND NOT n.TopicID IN u.disliked_tops RETURN n.TopicID AS topicid, score AS score, n.words AS words, n.word_weights AS weights ORDER BY score DESC LIMIT 10',
            /*'MATCH (u:User{UserID:$userid}) CALL gds.pageRank.stream("bbc_recs",{maxIterations: 100, dampingFactor: 0.85, sourceNodes:[u], relationshipWeightProperty: "weight"}) YIELD nodeId, score WITH gds.util.asNode(nodeId) as n, (score/u.source_score)*100 as score WHERE "Topic" in labels(n) AND NOT n.TopicID IN u.disliked_tops RETURN n.TopicID AS topicid, score AS score, n.words AS words, n.word_weights AS weights ORDER BY score DESC LIMIT 10',*/
            { userid: userid }
        )
            .then(result => {
                result.records.filter(r => r.get('score') >= 5).forEach(record => { // can use .slice(0,10) to limit the number of records filtered
                    var topic_obj = {}
                    var data = []
                    var topic_score = record.get('score')
                    record.get('words').forEach(w => {
                        data.push({ name: w })
                    })

                    var index = 0
                    record.get('weights').forEach(g => {
                        data[index]['value'] = g * topic_score * 1000 // * 1000 to accentuate the differences
                        data[index]['original'] = g * topic_score
                        index++
                    })
                    // To create global variable top_topics for use in updateInterests_script.js and addInterests_script.js
                    top_topics[record.get('topicid')] = {'words': record.get('words')}

                    topic_obj['name'] = "Topic " + record.get('topicid').toString() 
                    topic_obj['data'] = data
                    overall_data.push(topic_obj)
                })
                result.records.filter(r => r.get('score') < 5).slice(0,3).forEach(record => { // using slicing here to suggest only the top 3 topics that have scores < 5
                    suggested_topics.push({ 'val': record.get('topicid'), 'words': record.get('words') })
                })
            })
            .catch(error => {
                console.log(error)
            })

        await session.run(
            // Pagerank score threshold being 0.5 when looking at Top Entities to be shown -- can be adjusted
            'MATCH (u:User{UserID:$userid}), (n) WHERE (n.TopicID IN u.liked_tops OR n.Name+" ("+labels(n)[1..][0]+")" IN u.liked_ents) AND NOT (u)-[:READ]->()-[:HAS_ENTITY|:HAS_TOPIC]->(n) WITH COLLECT(n) AS likes MATCH (u:User{UserID:5}) CALL gds.pageRank.stream("bbc_recs",{maxIterations: 100, dampingFactor: 0.85, sourceNodes:[u]+likes, relationshipWeightProperty: "weight"}) YIELD nodeId, score WITH gds.util.asNode(nodeId) as n, (score/u.source_score)*100 as score WHERE "Entity" in labels(n) AND NOT n.Name IN u.disliked_ents RETURN n.Name AS entname, labels(n)[1..][0] AS ent_label, score AS score ORDER BY score DESC LIMIT 20',
            /*'MATCH (u:User{UserID:$userid}) CALL gds.pageRank.stream("bbc_recs",{maxIterations: 100, dampingFactor: 0.85, sourceNodes:[u], relationshipWeightProperty: "weight"}) YIELD nodeId, score WITH gds.util.asNode(nodeId) as n, (score/u.source_score)*100 as score WHERE "Entity" in labels(n) AND NOT n.Name IN u.disliked_ents RETURN n.Name AS entname, labels(n)[1..][0] AS ent_label, score AS score ORDER BY score DESC LIMIT 20',*/
            { userid: userid }
        )
            .then(result => {
                var total_scores = 0
                var entScores = []
                var entNames = []
                result.records.filter(r => r.get('score') >= 0.5).forEach(record => {
                    var entScore = record.get('score')
                    var entName = record.get('entname')
                    // To create global variable top_entities for use in updateInterests_script.js and addInterests_script.js
                    top_entities[entName] = {}

                    total_scores += entScore
                    entScores.push(entScore)
                    entNames.push(entName)
                })
                result.records.filter(r => r.get('score') < 0.5).slice(0,10).forEach(record => {
                    suggested_entities.push({ 'val': record.get('entname'), 'sidelab': record.get('ent_label') })
                })
                var data = []
                var proportions = []
                entScores.forEach(score => {
                    proportions.push(score / total_scores * 100)
                })
                var argmax_prop = proportions.reduce((curr_max, x, i, arr) => x > arr[curr_max] ? i : curr_max, 0);
                for (var i = 0; i < proportions.length; i++) {
                    var obj = { name: entNames[i], y: proportions[i] }
                    if (i == argmax_prop) {
                        obj['sliced'] = true
                        obj['selected'] = true
                    }
                    data.push(obj)
                }
                overall_data2[0]['data'] = data
            })
            .catch(error => {
                console.log(error)
            })
            .then(() => session.close())

    } finally {
        await session.close()
        // HighCharts Packed Bubble Chart
        Highcharts.theme = {
            colors: ['#2b908f', '#90ee7e', '#f45b5b', '#7798BF', '#aaeeee', '#ff0066',
                '#eeaaee', '#55BF3B', '#DF5353', '#7798BF', '#aaeeee'],
            chart: {
                backgroundColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 1, y2: 1 },
                    stops: [
                        [0, '#2a2a2b'],
                        [1, '#3e3e40']
                    ]
                },
                style: {
                    fontFamily: "\"Open Sans\", sans-serif"
                },
                plotBorderColor: '#606063'
            },
            title: {
                style: {
                    color: '#E0E0E3',
                    fontSize: '20px'
                }
            },
            subtitle: {
                style: {
                    color: '#E0E0E3'
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                style: {
                    color: '#F0F0F0'
                }
            },
            plotOptions: {
                series: {
                    dataLabels: {
                        style: {
                            fontSize: '13px'
                        }
                    },
                    marker: {
                        lineColor: '#333' // To allow bubbles to have the black outline
                    }
                }
            },
            legend: {
                backgroundColor: '#F8F8F8',
                itemStyle: {
                    color: 'black'
                },
                itemHoverStyle: {
                    color: 'dimgrey'
                },
                itemHiddenStyle: {
                    color: '#606063'
                },
                title: {
                    style: {
                        color: '#C0C0C0'
                    }
                }
            },
            labels: {
                style: {
                    color: '#707073'
                }
            }
        };
        // Apply the dark theme
        Highcharts.setOptions(Highcharts.theme);
        Highcharts.chart('container', {
            chart: {
                type: 'packedbubble',
                height: '90%',
                events: {
                    load() {
                        document.getElementById("preloader").style.display = "none"
                    }
                }
            },
            title: {
                text: 'Topics We Think You Might Be Interested In'
            },
            subtitle: {
                text: 'Based on documents you viewed, interests you have indicated, and documents users similar to you viewed (to a smaller extent).'
            },
            tooltip: {
                useHTML: true,
                //headerFormat: '<span style="color:{point.color}">●</span> <span style="font-size: 10px"> {series.name}</span><br/>',
                pointFormat: 'Word: <b>{point.name}</b><br>Overall Score: <b>{point.original:.3f}</b>'
            },
            plotOptions: {
                series: {
                    showInLegend: true,
                    states: {
                        hover: {
                            enabled: true
                        },
                        inactive: {
                            enabled: true
                        },
                        select: {
                            enabled: false
                        }
                    }
                },
                packedbubble: {
                    stickyTracking: false,
                    draggable: true,
                    //allowPointSelect: true,
                    //cursor: 'pointer',
                    minSize: '20%',
                    maxSize: '90%',
                    zMin: 0,
                    zMax: 1000,
                    layoutAlgorithm: {
                        gravitationalConstant: 0.06,
                        splitSeries: true,
                        seriesInteraction: false,
                        dragBetweenSeries: false,
                        parentNodeLimit: true
                    },
                    dataLabels: {
                        enabled: true,
                        allowOverlap: false,
                        format: '{point.name}',
                        style: {
                            color: 'black',
                            textOutline: 'none',
                            fontWeight: 'normal'
                        }
                    }
                }
            },
            series: overall_data
        });

        // Highcharts Pie Chart
        Highcharts.chart('container2', {
            chart: {
                type: 'pie',
                height: '80%',
                events: {
                    load() {
                        document.getElementById("preloader2").style.display = "none"
                    }
                }
            },
            title: {
                text: 'Entities We Think You Might Be Interested In'
            },
            subtitle: {
                text: 'Based on documents you viewed, interests you have indicated, and documents users similar to you viewed (to a smaller extent).'
            },
            tooltip: {
                useHTML: true,
                pointFormat: 'Proportion: <b>{point.y:.1f}%</b>'
            },
            accessibility: {
                point: {
                    valueSuffix: '%'
                }
            },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: true,
                        format: '<b>{point.name}</b>: {point.y:.1f}%',
                        style: {
                            color: '#E0E0E3',
                            textOutline: 'none',
                            fontWeight: 'normal'
                        }
                    }
                }
            },
            series: overall_data2
        });
    }
}

var slideIndex = 1;
showSlides(slideIndex);

// Next/Previous Controls
function plusSlides(n) {
    showSlides(slideIndex += n);
}

// Dot/Bullet Controls
function currentSlide(n) {
    showSlides(slideIndex = n);
}

function showSlides(n) {
    var i;
    var slides = document.getElementsByClassName("figures");
    var dots = document.getElementsByClassName("dot");
    var prev_button = document.getElementById("prev")
    var next_button = document.getElementById("next")
    if (n == 1) {
        prev_button.style.display = 'none'
        next_button.style.display = 'block'
    } else if (n == slides.length) {
        next_button.style.display = 'none'
        prev_button.style.display = 'block'
    } else {
        next_button.style.display = 'block'
        prev_button.style.display = 'block'
    }
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
    for (i = 0; i < dots.length; i++) {
        dots[i].className = dots[i].className.replace(" dot_active", "");
    }
    slides[slideIndex - 1].style.display = "block";
    dots[slideIndex - 1].className += " dot_active";
}
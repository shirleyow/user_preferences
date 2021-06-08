// When there are no existing preferences or no new preferences that can be added, add a NIL mask. 

// Neo4j DB
const session3 = driver.session() // Create new session for simultaneous running of sessions. Will still have to run session to count the number of recent documents read.
var topics_to_remove = new Set()
var entities_to_remove = new Set()

const setup = async function (userid) {
    await start(userid) // From highcharts_script; to use results from queries in highcharts_script here.
    try {
        var topics = Object.keys(top_topics) // Array of top topics based on PageRank score.
        var entities = Object.keys(top_entities) // Array of top entities based on PageRank score.
        // WHERE r.weight > threshold --> this threshold depends on how recent you want the documents that you count (with the topic within) to be!
        await session3.run("MATCH (u:User{UserID:$userid})-[r:READ]->(d:Document)-[:HAS_TOPIC|HAS_ENTITY]->(t) WHERE r.weight > 0 RETURN t.TopicID AS topic, t.Name AS entity, COUNT(d) AS count", { userid: userid })
            .then(result => {
                result.records.filter(r => ((r.get('topic') && topics.includes(r.get('topic').toString())) || entities.includes(r.get('entity')))).forEach(record => {
                    if (record.get('topic')) top_topics[record.get('topic')]['doc_count'] = record.get('count')
                    else top_entities[record.get('entity')]['count'] = record.get('count')
                })
            })
            .catch(error => {
                console.log(error)
            });
    } finally {
        var count = 1
        var row_cnt = 1
        topics.forEach(t => {
            if (count % 2 == 0) {
                $("#row" + (count / 2).toString()).append("<td category='topic' value='" + t + "' class='clickable' data-toggle='tooltip' data-placement='auto' data-html='true' title='<b>Keywords</b>:<br>" + top_topics[t]['words'].join(", ") + (top_topics[t]['doc_count'] ? "<br><br>This topic appeared in <b>" + top_topics[t]['doc_count'] + "</b> of your recently read docs." : "<br><br>This topic appeared in docs read by users similar to you.") + "'>Topic " + t + "<i class='far fa-check-circle checked'></i></td>")
                count++;
            } else {
                $("#pref_table").append("<tr id='row" + row_cnt + "'><td category='topic' value='" + t + "' class='clickable' data-toggle='tooltip' data-placement='auto' data-html='true' title='<b>Keywords</b>:<br>" + top_topics[t]['words'].join(", ") + (top_topics[t]['doc_count'] ? "<br><br>This topic appeared in <b>" + top_topics[t]['doc_count'] + "</b> of your recently read docs." : "<br><br>This topic appeared in docs read by users similar to you.") + "'>Topic " + t + "<i class='far fa-check-circle checked'></i></td></tr>")
                count++;
                row_cnt++;
            }
        })
        entities.forEach(e => {
            if (count % 2 == 0) {
                $("#row" + (count / 2).toString()).append("<td category='entity' value='" + e + "' sidelab='" + top_entities[e]['sidelab'] + "' class='clickable' data-toggle='tooltip' data-placement='auto' data-html='true' title='" + "<b>" + top_entities[e]['sidelab'] + "</b><br>" + (top_entities[e]['count'] ? "This entity appeared in <b>" + top_entities[e]['count'] + "</b> of your recently read docs." : "This entity appeared in docs read by users similar to you.") + "'>" + e + "<i class='far fa-check-circle checked'></i></td>")
                count++;
            } else {
                $("#pref_table").append("<tr id='row" + row_cnt + "'><td category='entity' value='" + e + "' sidelab='" + top_entities[e]['sidelab'] + "' class='clickable' data-toggle='tooltip' data-placement='auto' data-html='true' title='" + "<b>" + top_entities[e]['sidelab'] + "</b><br>" + (top_entities[e]['count'] ? "This entity appeared in <b>" + top_entities[e]['count'] + "</b> of your recently read docs." : "This entity appeared in docs read by users similar to you.") + "'>" + e + "<i class='far fa-check-circle checked'></i></td></tr>")
                count++;
                row_cnt++;
            }
        })
        document.getElementById("preloader3").style.display = "none"
    }
}

$('#pref_table').on('click', '.clickable', function (event) {
    if ($(this).hasClass('active')) {
        $(this).removeClass('active font-weight-bold');
        $("i", this).addClass('checked')
        if ($(this).attr('category') == 'topic')
            topics_to_remove.delete(parseInt($(this).attr('value')))
        else
            entities_to_remove.delete($(this).attr('value') + " (" + $(this).attr('sidelab') + ")")
    } else {
        $(this).addClass('active font-weight-bold')
        $("i", this).removeClass('checked')
        if ($(this).attr('category') == 'topic')
            topics_to_remove.add(parseInt($(this).attr('value')))
        else
            entities_to_remove.add($(this).attr('value') + " (" +  $(this).attr('sidelab') + ")")
        //console.log(Array.from(topics_to_remove))
    }
});

$(document).ready(function () {
    $("body").tooltip({ selector: '[data-toggle=tooltip]' });
});

async function updateExistingPref() {
    // Updating the neo4j data would require you to recreate the bbc_data gds graph!
    try {
        await session3.run("CALL gds.graph.drop('bbc_recs')")
    } finally {
        var tops_remove = Array.from(topics_to_remove) // Array from Set
        var ents_remove = Array.from(entities_to_remove)
        try {
            // Change weights
            await session3.run("MATCH (t:Topic)-[r]-(d:Document)-[:READ_BY]->(u:User{UserID:$userid}) WHERE t.TopicID IN $tops_remove SET r.weight=0", { userid: userid, tops_remove: tops_remove })
            await session3.run("MATCH (e:Entity)-[r]-(d:Document)-[:READ_BY]->(u:User{UserID:$userid}) WHERE e.Name+' ('+labels(e)[1..][0]+')' IN $ents_remove SET r.weight=0", { userid: userid, ents_remove: ents_remove })
            await session3.run("MATCH (u:User{UserID:$userid}) SET u.disliked_tops=u.disliked_tops + $tops_remove, u.disliked_ents=u.disliked_ents + $ents_remove", { userid: userid, tops_remove: tops_remove, ents_remove: ents_remove })
            // need to also remove topics/entities disliked from the user's liked topics and entities if present
            await session3.run("MATCH (u:User{UserID:$userid}) SET u.liked_tops=[t IN u.liked_tops WHERE NOT t IN u.disliked_tops], u.liked_ents=[e IN u.liked_ents WHERE NOT e IN u.disliked_ents]", { userid: userid })
            // If user has not read a document with this topic/entity before, indicating dislike here does not affect the pagerank scores of the nodes,
            // and thus the recommmendations. By storing the disliked topics / entities, can manually adjust the recommendations such that docs containing
            // the disliked topics and entities will not be recommended to user. 
        } finally {
            init()
            prep() // includes await setup(userid) and start(userid)
            location.reload()
        }
    }
}

window.onbeforeunload = function () {
    window.scrollTo(0, 0);
  }
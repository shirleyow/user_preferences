<!DOCTYPE html>
<html lang="en">

<head>
    <title>Document Personalisation</title>
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.6.3/css/all.css" integrity="sha384-UHRtZLI+pbxtHCWp1t77Bi1L4ZtiqrqD80Kn4Z8NTSRyMA2Fd33n5dQ8lWUE00s/" crossorigin="anonymous">
    <link rel="stylesheet" href="./style.css">
</head>

<body>
    <div class="container">
        <h1 class="text-center">Document Personalisation</h1>
        <p class="text-center">We make your documment recommendations more relevant by customising the documents returned to your preferences.</p>
        <br>
        <div class="slideshow-container">
            <div class="figures">
                <figure class="highcharts-figure" style="border: 1px solid #aaa">
                    <div id="container"></div>
                    <img id="preloader" src="preloader.gif" alt="Loading..."></img>
                    <p class="highcharts-description">
                        Each topic is represented by a function of 10 words. The 'Overall Score' of each word = weight of word in topic &times; weight of topic given your user profile. The approx. relative weights of each topic can be seen in the relative sizes of the Topic nodes.
                    </p>
                </figure>
            </div>
            <div class="figures">
                <figure class="highcharts-figure" style="border: 1px solid #aaa">
                    <img id="preloader2" src="preloader.gif" alt="Loading..."></img>
                    <div id="container2"></div>
                </figure>
            </div>
            <a class="prev" id="prev" onclick="plusSlides(-1)">&#10094;</a>
            <a class="next" id="next" onclick="plusSlides(1)">&#10095;</a>
        </div>
        <br>
        <!-- The dots/circles -->
        <div style="text-align:center">
            <span class="dot" onclick="currentSlide(1)"></span>
            <span class="dot" onclick="currentSlide(2)"></span>
        </div>
    </div>
    <script src="https://code.highcharts.com/highcharts.js"></script>
    <script src="https://code.highcharts.com/highcharts-more.js"></script>
    <script src="https://code.highcharts.com/modules/exporting.js"></script>
    <script src="https://code.highcharts.com/modules/accessibility.js"></script>
    <script src="https://unpkg.com/neo4j-driver@4.2.3/lib/browser/neo4j-web.js"></script>
    <script async src="./script.js"></script>
</body>

</html>
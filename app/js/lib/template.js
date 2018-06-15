module.exports = makeTemplate

function makeTemplate(template, id, data) {
    var element = document.getElementById(id);
    if (element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
        element.innerHTML = template;
    } else {
        console.log(element + ' not found')
    }
}
//- Compile the template folder. Posts should be inserted into the "posts.html" template.

import * as fs from 'fs';
import Handlebars from 'handlebars';
import { marked } from 'marked';

console.log("compiling...");

Handlebars.registerHelper("longdate", function (dateString) {
    const date = new Date(dateString.replace(/\//g, '-')); // Replace / with - for better parsing

    // Extract components
    const year = date.getFullYear();
    const month = date.toLocaleString('default', { month: 'long' });
    const day = date.getDate();

    // Function to get ordinal suffix
    function getOrdinalSuffix(day) {
        if (day > 3 && day < 21) return "th"; // Handles 11th - 13th
        switch (day % 10) {
            case 1: return "st";
            case 2: return "nd";
            case 3: return "rd";
            default: return "th";
        }
    }

    const formattedDate = `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
    return formattedDate;
});

let templates = "template";
let output = "output";
let posts = [
    "minimalism",
    "technology-looking-for-a-problem",
    "finish-what-you-start"
];

let pages = ["index", "bouncy"];

//- Grab the layout
let layout = fs.readFileSync(`${templates}/layout.hbs`, {encoding: 'utf8'});
layout = Handlebars.compile(layout);

let compilePage = (path) => {
    let content = fs.readFileSync(`${templates}/${path}.hbs`, {encoding: 'utf8'});
    return layout({content: content});
}

pages.forEach(page => {
    //- Compile the page and write to output
    fs.writeFileSync(`${output}/${page}.html`, compilePage(page));
})

let postLayout = fs.readFileSync(`${templates}/posts/layout.hbs`, {encoding: 'utf8'});
postLayout = Handlebars.compile(postLayout);

//- set up marked
function get_md_metadata(markdown) {
    //- get options in between !-- and --! headers

    const regex =  /!--([\s\S]*?)--!/;
    const match = markdown.match(regex);
    if(match) {
        //- Explode each line by : 
        let content = match[1];
        let lines = content.split(/\r?\n/).filter(item => item.trim() !== "");
        let meta = {};
        lines.forEach(line => {
            let split = line.split(":");
            let field = split[0].trim();
            let value = split[1].trim();
            meta[field] = value;
        })
        return meta;
    } else {
        return {};
    }
}

function trim_md_metadata(markdown) {
    const regex =  /!--([\s\S]*?)--!/;
    return markdown.replace(regex, "");
}

//- Compile blog posts
let allMeta = [];
posts.forEach(post => {
    //- Use Marked to compile the md into a post.
    let content = fs.readFileSync(`${templates}/posts/${post}.md`, {encoding: 'utf8'});
    let meta = get_md_metadata(content);
    meta['link'] = `/posts/${post}`;
    allMeta.push(meta);
    content = trim_md_metadata(content);
    content = marked.parse(content);

    //- shove into layout
    let page = layout({content: postLayout({
        title: meta['title'], 
        subtitle: meta['subtitle'], 
        date: meta['date'], 
        content: content
    })});

    //- Put into output
    fs.mkdirSync(`${output}/posts`, { recursive: true });
    fs.writeFileSync(`${output}/posts/${post}.html`, page);
})

//- render posts page using metadata
allMeta.sort((a, b) => {
    //- Convert dates to js dates
    let date1 = new Date(a.date);
    let date2 = new Date(b.date);
    return date2 - date1;
})
let postsPage = fs.readFileSync(`${templates}/posts.hbs`, {encoding: 'utf8'});
postsPage = Handlebars.compile(postsPage);
postsPage = layout({content: postsPage({
    posts: allMeta
})});
fs.writeFileSync(`${output}/posts.html`, postsPage);

//- move assets to output folder
fs.cp(`${templates}/assets`, `${output}/assets`, {recursive: true}, err => {
    // console.log(err);
});

console.log("done!");
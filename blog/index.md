---
layout: default
title: "Blog"
description: "Thoughts on ML Engineering, TTRPG Design, and Code Adventures"
---

# Blog

Welcome to my blog! Here I write about machine learning engineering, tabletop RPG design, and various coding adventures.

## Latest Posts

{% if site.posts.size > 0 %}
<div class="post-list">
{% for post in site.posts %}
<article class="post-item">
  <div class="post-meta">
    <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%B %d, %Y" }}</time>
    {% if post.tags %}
    <div class="post-tags">
      {% for tag in post.tags %}
      <span class="tag">{{ tag }}</span>
      {% endfor %}
    </div>
    {% endif %}
  </div>
  
  <h2><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h2>
  
  <div class="post-excerpt">
    {{ post.excerpt }}
  </div>
  
  <a href="{{ post.url | relative_url }}" class="read-more">Read more →</a>
</article>
{% endfor %}
</div>
{% else %}
<div class="no-posts">
  <h3>Coming Soon!</h3>
  <p>Blog posts are on their way. In the meantime, check out my <a href="{{ '/rpg/' | relative_url }}">RPG games</a> or explore my <a href="{{ '/projects/' | relative_url }}">projects</a>.</p>
  
  <h4>Upcoming Topics:</h4>
  <ul>
    <li>Building ML pipelines with modern Python tooling</li>
    <li>Designing diceless RPG mechanics</li>
    <li>Claude Code automation workflows</li>
    <li>Graph neural networks for real-world applications</li>
    <li>Knowledge management with Logseq</li>
  </ul>
</div>
{% endif %}

## Categories

- **Machine Learning** - Practical ML engineering and research insights
- **RPG Design** - Game mechanics, playtesting, and design philosophy  
- **Code Adventures** - Programming experiments and tool discoveries
- **Knowledge Management** - Personal systems and workflows
- **Career Growth** - Lessons from transitioning between roles and domains

## Subscribe

Want to stay updated? Follow me on [Medium](https://medium.com/@ronie) where I cross-post articles, or connect with me on [GitHub](https://github.com/ruliana) to see what I'm working on.
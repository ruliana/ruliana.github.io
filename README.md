# Stochastic Ideas

A modern Jekyll blog showcasing ML Engineering, TTRPG Design, and Code Adventures by Ronie Uliana.

🌐 **Live Site**: [https://ruliana.github.io](https://ruliana.github.io)

## Quick Start

### Prerequisites
- Ruby (>= 2.7)
- Bundler gem
- Git

### Local Development
```bash
# Navigate to the blog directory
cd ~/creative/ruliana.github.io

# Install dependencies
bundle install

# Start the development server
bundle exec jekyll serve

# Visit http://localhost:4000
```

### Build for Production
```bash
bundle exec jekyll build
```

## Content Structure

### Blog Posts
Create new posts in `_posts/` using the naming convention:
```
_posts/YYYY-MM-DD-title-with-hyphens.md
```

**Front matter example:**
```yaml
---
layout: post
title: "Your Post Title"
date: 2024-01-15
categories: [ml, programming]
tags: [python, tensorflow, research]
---
```

### RPG Games
Add new games to `_rpg/` collection:
```yaml
---
layout: rpg
title: "Game Name"
description: "Brief game description"
version: "1.0.0"
pdf_url: "/files/game-file.pdf"
mobile_pdf_url: "/files/game-file-mobile.pdf"
---
```

### Projects
Showcase projects in `_projects/` collection:
```yaml
---
layout: project
title: "Project Name"
description: "Project description"
tech_stack: [Python, React, PostgreSQL]
github_url: "https://github.com/ruliana/project"
demo_url: "https://project-demo.com"
---
```

### Pages
Create standalone pages as `.md` files in the root directory.

## Development Workflow

### Adding New Content
```bash
# Create a new blog post
touch "_posts/$(date +%Y-%m-%d)-your-post-title.md"

# Create a new RPG game
touch "_rpg/your-game-name.md"

# Create a new project
touch "_projects/your-project-name.md"
```

### Testing Changes
```bash
# Serve with drafts
bundle exec jekyll serve --drafts

# Serve with future posts
bundle exec jekyll serve --future

# Incremental builds (faster)
bundle exec jekyll serve --incremental
```

### Asset Management
- **Images**: Store in `images/` directory
- **Files**: Store PDFs and downloads in `files/` directory  
- **Styles**: Custom CSS in `assets/css/modern.css`
- **Scripts**: Custom JavaScript in `assets/js/modern.js`

## Site Features

### Collections
- **Posts**: Blog articles with categories and tags
- **RPG**: TTRPG game showcases with PDF downloads
- **Projects**: Development project portfolio

### Plugins
- `jekyll-feed`: RSS/Atom feeds
- `jekyll-sitemap`: Automatic sitemap generation
- `jekyll-seo-tag`: Meta tags and SEO optimization

### Theme Customization
- **Colors**: Modify theme colors in `_config.yml`
- **Fonts**: Inter font family for modern typography
- **Layout**: Responsive, mobile-first design
- **Animations**: Smooth interactions and transitions

## Directory Structure

```
ruliana.github.io/
├── _config.yml              # Jekyll configuration
├── Gemfile                  # Ruby dependencies
├── _includes/               # Reusable HTML components
├── _layouts/                # Page templates
├── _posts/                  # Blog posts
├── _projects/               # Project showcases
├── _rpg/                    # RPG game pages
├── _sass/                   # Sass stylesheets
├── assets/                  # CSS, JS, fonts
├── blog/                    # Blog index page
├── files/                   # PDF downloads
├── images/                  # Image assets
└── index.md                 # Homepage
```

## Integration with Workspace

This blog is part of the broader workspace automation system. See the main [~/README.md](../../README.md) for:

- **Content Creation**: Use `blog-init` to convert Logseq notes to posts
- **Publishing**: Use `blog-publish` to deploy to multiple platforms
- **Automation**: Integrated with Claude Code workflows

### Quick Commands from Automation System
```bash
# Create blog post from Logseq content
blog-init "Your Topic" --format=github

# Publish to GitHub Pages
blog-publish ~/creative/blog-drafts/your-post.md --to=github

# Navigate to blog directory
zc ruliana.github.io
```

## Deployment

### GitHub Pages (Automatic)
- Push to `master` branch
- GitHub Pages builds and deploys automatically
- Uses `github-pages` gem for compatibility

### Manual Deploy
```bash
# Build the site
bundle exec jekyll build

# Deploy _site/ directory to your hosting provider
```

## Configuration

### Site Settings
Edit `_config.yml` to customize:
- Site title and description
- Author information
- Social media links
- Theme colors
- Collection settings

### Social Links
Configure social media profiles in `_config.yml`:
```yaml
social:
  github: "ruliana"
  medium: "@ronie"  
  twitter: "ronie"
  linkedin: "ruliana"
```

## Troubleshooting

### Common Issues
```bash
# Update dependencies
bundle update

# Clear Jekyll cache
bundle exec jekyll clean
bundle exec jekyll serve

# Fix permission issues on macOS
sudo gem install bundler jekyll
```

### Build Errors
- Check Ruby version compatibility
- Ensure all front matter is valid YAML
- Verify file naming conventions
- Review Jekyll build logs for specific errors

## Contributing

This is a personal blog, but feel free to:
- Report issues or suggest improvements
- Share ideas for content or features
- Contribute to the automation workflows

---

Built with ❤️ using Jekyll and deployed on GitHub Pages.
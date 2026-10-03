# Requirements context

- Extract the first 30 entries from https://news.ycombinator.com/

- For each entry, extract: 
    - number(rank)
    - title
    - points
    - number of comments

- Filter Entries:
    - Long title: Titles with more than 5 words, sorted by number of comments
    - Short title: Titles with five words or fewer, sorted by points
    - Word-counting rules:
        - Count words separated by spaces
        - Exclude symbols
        - Example: “This is - a self-explained example” has five words.

- Usage data:
    - Store usage data, at least the request timestamp and the applied filter.
    - Choose any suitable storage mechanism, such as a database or cache.
    - Optionally store additional fields to track user interaction and crawler behavior.


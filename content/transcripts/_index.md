+++
# Transcript pages render at /transcripts/<n>/ but the section index itself
# never renders — /transcripts/ is an alias redirect to /transcripts/page/1
# (carried on the transcripts-1 listpage stub), matching the old Astro
# config redirect. Hand-maintained; the pages are source (written by the
# episode pipeline), tools/prebuild.py only refreshes their display_date.
render = false
sort_by = "date"
page_template = "transcript.html"
+++

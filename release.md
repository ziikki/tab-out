# Release Process

This document outlines the steps to take when preparing a new release of Tab Out.

## 1. Update Screenshot
Every release should have an updated screenshot of the dashboard reflecting the latest UI changes and features.

### Generation Steps:
1. Open Chrome with the latest version of the extension loaded.
2. Open several example tabs to populate the dashboard:
   - **Homepages**: Gmail, X (Twitter), LinkedIn, YouTube, GitHub.
   - **Common Sites**: Google Search, Gemini, News sites (NYT, BBC), etc.
   - **Duplicates**: Open at least one page twice to show the duplicate badge.
   - **Saved for Later**: Save 2-3 tabs to the sidebar.
3. Open a New Tab (Tab Out dashboard).
4. Take a high-resolution screenshot of the dashboard.
5. Save the screenshot to `screenshots/dashboard.jpg`.

## 2. Update README.md
Ensure the `README.md` reflects the latest features and contains the new screenshot.

- Check the "Features" list.
- Ensure the image link `![Tab Out Dashboard](screenshots/dashboard.jpg)` is correct.
- Update the version number if applicable.

## 3. Verify Local Functionality
- Ensure no data is sent externally (check Network tab).
- Verify "Save for Later" persists after browser restart.
- Verify "Close duplicates" works as expected.

## 4. Trigger Word
When the keyword **"release"** is mentioned, follow these steps to ensure the repository is ready for public view.

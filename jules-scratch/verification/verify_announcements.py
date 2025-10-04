import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-web-security"]
        )
        page = await browser.new_page()

        # Navigate to the local index.html file
        await page.goto(f"file:///app/index.html")

        # Wait for the loading spinner to disappear, with a longer timeout
        await expect(page.locator("#loading")).to_be_hidden(timeout=30000)

        # Wait for the announcements to be visible
        await expect(page.locator("#announcements")).to_be_visible(timeout=15000)

        # Check that at least one announcement card is visible
        await expect(page.locator(".announcement-card").first).to_be_visible(timeout=15000)

        # Take a screenshot
        await page.screenshot(path="jules-scratch/verification/verification.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
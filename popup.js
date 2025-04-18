// Load settings when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup opened, loading settings...');
  const settings = await browser.storage.local.get({
    minViews: 10000,
    minDuration: 120,
    hideShorts: true
  });
  console.log('Loaded settings:', settings);

  document.getElementById('minViews').value = settings.minViews;
  document.getElementById('minDuration').value = settings.minDuration;
  document.getElementById('hideShorts').checked = settings.hideShorts;
});

// Save settings when button is clicked
document.getElementById('saveSettings').addEventListener('click', async () => {
  const settings = {
    minViews: parseInt(document.getElementById('minViews').value),
    minDuration: parseInt(document.getElementById('minDuration').value),
    hideShorts: document.getElementById('hideShorts').checked
  };
  console.log('Saving settings:', settings);

  try {
    await browser.storage.local.set(settings);
    console.log('Settings saved successfully');

    // Verify settings were saved
    const savedSettings = await browser.storage.local.get();
    console.log('Verified saved settings:', savedSettings);

    // Show success message
    const status = document.getElementById('status');
    status.textContent = 'Settings saved!';
    status.style.display = 'block';
    status.classList.add('success');

    // Hide message after 2 seconds
    setTimeout(() => {
      status.style.display = 'none';
    }, 2000);

    // Notify content script of settings change
    const tabs = await browser.tabs.query({ url: '*://*.youtube.com/*' });
    console.log('Found YouTube tabs:', tabs);
    
    for (const tab of tabs) {
      try {
        await browser.tabs.sendMessage(tab.id, { type: 'settingsUpdated', settings });
        console.log('Settings update sent to tab:', tab.id);
      } catch (err) {
        console.error('Failed to send message to tab:', tab.id, err);
      }
    }
  } catch (err) {
    console.error('Failed to save settings:', err);
    const status = document.getElementById('status');
    status.textContent = 'Error saving settings!';
    status.style.display = 'block';
    status.style.background = '#ffe6e6';
    status.style.color = '#cc0000';
  }
}); 
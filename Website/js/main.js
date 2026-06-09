const menuToggle=document.querySelector('.menu-toggle');
const mainNav=document.querySelector('.main-nav');
if(menuToggle&&mainNav){menuToggle.addEventListener('click',()=>mainNav.classList.toggle('active'));}


// INNOVPH Website Subscribe Automation
const subscribeForm = document.getElementById('subscribeForm');
const subscribeMessage = document.getElementById('subscribeMessage');

if (subscribeForm) {
  subscribeForm.addEventListener('submit', async function(event) {
    event.preventDefault();

    const emailInput = document.getElementById('subscriberEmail');
    const email = emailInput.value.trim();

    if (!email) {
      subscribeMessage.textContent = 'Please enter your email address.';
      subscribeMessage.className = 'subscribe-message error';
      return;
    }

    subscribeMessage.textContent = 'Submitting your subscription...';
    subscribeMessage.className = 'subscribe-message';

    try {
      await fetch('https://script.google.com/macros/s/AKfycbwDo7WnO7GJv7VhEhu_jcb5MWDCT4ojpuDfY64_wFwXGyJYejtY8Vplc1mkeEIwnhAZ/exec', {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email
        })
      });

      subscribeMessage.textContent = "Thank you for subscribing. You'll receive updates from INNOVPH soon.";
      subscribeMessage.className = 'subscribe-message success';
      subscribeForm.reset();

    } catch (error) {
      subscribeMessage.textContent = 'Something went wrong. Please try again later.';
      subscribeMessage.className = 'subscribe-message error';
    }
  });
}

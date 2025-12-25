document.addEventListener('DOMContentLoaded', () => {
    const themeSwitch = document.getElementById('themeSwitch');
    const currentTheme = localStorage.getItem('theme');

    // Set light theme as default
    if (currentTheme === 'dark-theme') {
        document.body.classList.remove('light-theme');
        if (themeSwitch) {
            themeSwitch.checked = false;
        }
    } else {
        document.body.classList.add('light-theme');
        if (themeSwitch) {
            themeSwitch.checked = true;
        }
    }

    if (themeSwitch) {
        themeSwitch.addEventListener('change', function() {
            if(this.checked) {
                document.body.classList.add('light-theme');
                localStorage.setItem('theme', 'light-theme');
            } else {
                document.body.classList.remove('light-theme');
                localStorage.setItem('theme', 'dark-theme');
            }
        });
    }
});
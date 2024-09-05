const container = document.querySelector('.container');
const LoginLink = document.querySelector('.SignInLink');
const RegisterLink = document.querySelector('.SignUpLink');

RegisterLink.addEventListener('click', () =>{
    container.classList.add('active');
})

LoginLink.addEventListener('click', () => {
    container.classList.remove('active');
})

document.getElementById('popupBtn').addEventListener('click', function() {
    var popup = document.getElementById('popupContent');
    popup.classList.toggle('show');
});

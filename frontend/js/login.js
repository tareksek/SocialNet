
function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        if (!data.success) {
            alert(data.message);
            return;
        }

        // حفظ التوكن
        localStorage.setItem("token", data.token);
        alert("Login successful");

        // الانتقال للصفحة الرئيسية (سننشئها لاحقًا)
        // window.location.href = "home.html";
    });
}

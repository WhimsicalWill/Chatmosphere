import React from 'react';
import { GoogleLogin } from 'react-google-login';
import GitHubLogin from 'react-github-login';

const Login = () => {
  const responseGoogle = (response) => {
    // handle Google login response
  }

  const responseGithub = (response) => {
    // handle GitHub login response
  }

  return (
    <div className="login">
      <h2>Login</h2>
      <GoogleLogin
        clientId="YOUR_CLIENT_ID.apps.googleusercontent.com"
        buttonText="Login with Google"
        onSuccess={responseGoogle}
        onFailure={responseGoogle}
        cookiePolicy={'single_host_origin'}
      />
      <GitHubLogin 
        clientId="YOUR_GITHUB_CLIENT_ID" 
        onSuccess={responseGithub}
        onFailure={responseGithub}
      />
    </div>
  );
}

export default Login;

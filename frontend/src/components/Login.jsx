import React, { useContext } from 'react';
import { GoogleLogin } from 'react-google-login';
// import GitHubLogin from 'react-github-login';
import { UserContext } from '../UserContext';

const clientId = "659248674025-16qf4lh1ucjsa65e1j4i9fpv4085tieh.apps.googleusercontent.com";

const Login = () => {

  const { setUserID } = useContext(UserContext);

  const onSuccessGoogle = (response) => {
    console.log("Logged in with Google successfully");
    console.log(response);
    setUserID(response.profileObj);
  }

//   const onSuccessGitHub = (response) => {
//     console.log("Logged in with GitHub successfully");
//   }

  const onFailureGoogle = (response) => {
    console.log("Logging in with Google failed");
    console.log(response);
  }

//   const onFailureGitHub = (response) => {
//     console.log("Logging in with GitHub failed");
//   }

  return (
    <div className="login">
      <h2>Login</h2>
      <GoogleLogin
        clientId={clientId}
        buttonText="Login with Google"
        onSuccess={onSuccessGoogle}
        onFailure={onFailureGoogle}
        cookiePolicy={'single_host_origin'}
      />
      {/* <GitHubLogin 
        clientId="YOUR_GITHUB_CLIENT_ID" 
        // buttonText="Login with Github"
        onSuccess={onSuccessGitHub}
        onFailure={onFailureGitHub}
      /> */}
    </div>
  );
}

export default Login;

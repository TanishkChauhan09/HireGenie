import { createBrowserRouter } from "react-router";
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import Protected from "./features/auth/components/Protected";
import Home from "./features/interview/pages/Home";
import Generate from "./features/interview/pages/Generate";
import Interview from "./features/interview/pages/Interview";
import MockInterview from "./features/interview/pages/MockInterview";


export const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />
    },
    {
        path: "/register",
        element: <Register />
    },
    {
        path: "/",
        element: <Home />
    },
    {
        path: "/generate",
        element: <Protected><Generate /></Protected>
    },
    {
        path:"/interview/:interviewId",
        element: <Protected><Interview /></Protected>
    },
    {
        path: "/mock-interview",
        element: <Protected><MockInterview /></Protected>
    }
])

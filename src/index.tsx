/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";
import "./styles/global.scss";

render(() => <App />, document.getElementById("root") as HTMLElement);

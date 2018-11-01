import * as React from "react";
import { addLocaleData, IntlProvider } from "react-intl";
import englishLocaleData from "react-intl/locale-data/en";
import { connect, Provider } from "react-redux";
import Stream from "../Stream";
import Login from "../Login";
import Signup from "../Signup";
import CompleteSignup from "../CompleteSignup";
import Logger from "../logger";
import EventEmitter from "../event-emitter";

addLocaleData(englishLocaleData);

const Loading = props => (
	<div className="loading-page">
		<span className="loading loading-spinner-large inline-block" />
		<p>{props.message}</p>
	</div>
);

const UnauthenticatedRoutes = connect(state => state.route)(props => {
	switch (props.route) {
		case "signup":
			return <Signup />;
		case "login":
			return <Login />;
		case "completeSignup":
			return <CompleteSignup {...props.params} />;
		default:
			return <Login />;
	}
});

const mapStateToProps = state => ({
	bootstrapped: state.bootstrapped,
	loggedIn: Boolean(state.session.userId)
});
const Root = connect(mapStateToProps)(props => {
	if (!props.bootstrapped) return <Loading message="CodeStream engage..." />;
	if (!props.loggedIn) return <UnauthenticatedRoutes />;
	return <Stream />;
});

export default class Container extends React.Component {
	state = { hasError: false };

	static getDerivedStateFromError(error) {
		return { hasError: true };
	}

	componentDidCatch(error, info) {
		Logger.error(error, info);
	}

	handleClickReload = event => {
		event.preventDefault();
		EventEmitter.emit("interaction:clicked-reload-webview");
	};

	render() {
		const { i18n, store } = this.props;

		let content;
		if (this.state.hasError)
			content = (
				<div id="oops">
					<p>
						An unexpected error has occurred. <a onClick={this.handleClickReload}>Click here</a> to
						reload this tab.
					</p>
				</div>
			);
		else content = <Root />;

		return (
			<IntlProvider locale={i18n.locale} messages={i18n.messages}>
				<Provider store={store}>{content}</Provider>
			</IntlProvider>
		);
	}
}

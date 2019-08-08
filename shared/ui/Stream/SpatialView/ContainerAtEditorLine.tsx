import React, { ReactNode } from "react";
import { useSelector } from "react-redux";
import {
	getVisibleRanges,
	getVisibleLineCount,
	getLine0ForEditorLine
} from "@codestream/webview/store/editorContext/reducer";
import { CodeStreamState } from "@codestream/webview/store";
import { useRect, useUpdates } from "@codestream/webview/utilities/hooks";

export default function ContainerAtEditorLine(props: {
	lineNumber: number;
	children: ReactNode | ReactNode[];
	className?: string;
	repositionToFit?: boolean;
}) {
	const { logicalVisibleLineCount, line0 } = useSelector((state: CodeStreamState) => {
		const visibleRanges = getVisibleRanges(state.editorContext);
		return {
			logicalVisibleLineCount: getVisibleLineCount(visibleRanges),
			line0: getLine0ForEditorLine(visibleRanges, props.lineNumber)
		};
	});

	const [visibleLineCount, setVisibleLineCount] = React.useState(logicalVisibleLineCount);

	React.useEffect(() => {
		// Also done in InlineCodemarks::getDerivedStateFromProps
		// only set this if it changes by more than 1. we expect it to vary by 1 as
		// the topmost and bottommost line are revealed and the window is not an integer
		// number of lines high.
		if (Math.abs(logicalVisibleLineCount - visibleLineCount) > 1) {
			setVisibleLineCount(logicalVisibleLineCount);
		}
	}, [logicalVisibleLineCount]);

	const logicalPosition = React.useMemo(
		() =>
			props.lineNumber > 0 && line0 >= 0 ? (window.innerHeight * line0) / visibleLineCount : -1000,
		[props.lineNumber, line0, visibleLineCount]
	);

	const rootRef = React.useRef<HTMLElement>(null);
	const rootDimensions = useRect(rootRef, [logicalPosition]);

	const [position, setPosition] = React.useState(logicalPosition);
	const [adjustedPosition, setAdjustedPosition] = React.useState<number | undefined>(undefined);

	const getAdjustedPosition = React.useCallback((currentPosition: number, rootBottom: number) => {
		const domBodyDimensions = document.body.getBoundingClientRect();
		if (rootBottom >= domBodyDimensions.bottom - 15) {
			const newPosition = currentPosition - (rootBottom - domBodyDimensions.bottom + 120);
			if (newPosition !== currentPosition) {
				return newPosition;
			}
		}

		return currentPosition;
	}, []);

	// reposition after mounted in DOM
	React.useLayoutEffect(() => {
		if (props.repositionToFit) {
			let rootDimensions = rootRef.current!.getBoundingClientRect();

			const domBodyDimensions = document.body.getBoundingClientRect();
			if (rootDimensions.bottom >= domBodyDimensions.bottom) {
				const nextPosition = getAdjustedPosition(position, rootDimensions.bottom);
				if (nextPosition !== position) return setAdjustedPosition(nextPosition);
			}
		}
	}, []);

	// check whether adjustment is necessary after updates
	useUpdates(() => {
		if (props.repositionToFit) {
			if (adjustedPosition) {
				// if logicalPosition is higher than the adjustedPosition then adjustment isn't necessary anymore
				if (logicalPosition <= adjustedPosition) {
					setAdjustedPosition(undefined);
					setPosition(logicalPosition);
					return;
				}
			}
			// if still adjusted and logicalPosition has changed, update position and potentially adjustment
			if (position !== logicalPosition) {
				setPosition(logicalPosition);
				const nextPosition = getAdjustedPosition(
					logicalPosition,
					logicalPosition + rootDimensions.height
				);
				if (nextPosition !== logicalPosition) setAdjustedPosition(nextPosition);
			}
		} else {
			setPosition(logicalPosition);
		}
	}, [rootDimensions.height, rootDimensions.bottom, position, adjustedPosition, logicalPosition]);

	return (
		<span
			ref={rootRef}
			className={`plane-container ${props.className || ""}`}
			style={{
				transform: `${
					props.className && props.className.includes("cs-hidden")
						? "translateX(100vw) translateX(-55px) "
						: ""
				}translateY(${adjustedPosition || position}px)`
			}}
			data-top={adjustedPosition || position}
		>
			{props.children}
		</span>
	);
}

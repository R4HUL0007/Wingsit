const XSvg = (props) => (
	<svg
		viewBox="0 0 400 400"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<rect width="400" height="400" fill="none" />
		{/* WS Monogram - larger */}
		<text
			x="50%"
			y="160"
			textAnchor="middle"
			fontFamily="Montserrat, Arial, sans-serif"
			fontWeight="bold"
			fontSize="170"
			fill="#fff"
			letterSpacing="-12"
			dominantBaseline="middle"
		>
			WS
		</text>
		{/* Orange swoosh - moved lower */}
		<path
			d="M 80 220 Q 200 320 320 220"
			stroke="#FFA500"
			strokeWidth="16"
			fill="none"
			strokeLinecap="round"
		/>
		{/* App name: Wingsit - larger and lower */}
		<text
			x="50%"
			y="340"
			textAnchor="middle"
			fontFamily="Montserrat, Arial, sans-serif"
			fontWeight="bold"
			fontSize="80"
			fill="#fff"
			letterSpacing="0"
			dominantBaseline="middle"
		>
			Wings
		</text>
		<text
			x="50%"
			y="340"
			textAnchor="start"
			fontFamily="Montserrat, Arial, sans-serif"
			fontWeight="bold"
			fontSize="80"
			fill="#FFA500"
			letterSpacing="0"
			dominantBaseline="middle"
			dx="140"
		>
			it
		</text>
	</svg>
);

export default XSvg;
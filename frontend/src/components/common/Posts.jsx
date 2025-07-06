import Post from "./Post";
import PostSkeleton from "../skeletons/PostSkeleton";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

const Posts = ( { feedType, username, userId } ) => {
	const [error, setError] = useState("");

	const getPostEndpoint = () => {
		switch(feedType) {
			case "forYou":
				return "/api/posts/all";
			case "following":
				return "/api/posts/following";
			case "posts":
				return `/api/posts/user/${username}`;
			case "likes":
				return `/api/posts/likes/${userId}`;
			case "bookmarks":
				return "/api/posts/bookmarks";
			default:
				return "/api/posts/all";
		}
	}

	const POST_ENDPOINT = getPostEndpoint();

	const {
		data: posts,
		isLoading,
		refetch,
		isRefetching,
		error: queryError,
	} = useQuery({
		queryKey: ["posts"],
		queryFn: async () => {
			try {
				const res = await fetch(POST_ENDPOINT);
				const data = await res.json();

				if(!res.ok){
					throw new Error(data.error || "Something went wrong");
				}

				return data;

			} catch (error) {
				setError(error.message);
				throw error;
			}
		}
	})

	useEffect(() => {
		setError("");
		refetch();
	}, [feedType, refetch, username]);

	if (isLoading || isRefetching) {
		return (
			<div className='flex flex-col justify-center'>
				<PostSkeleton />
				<PostSkeleton />
				<PostSkeleton />
			</div>
		);
	}

	if (error || queryError) {
		return (
			<div className="text-center my-8 text-red-400 font-bold">
				{error || queryError.message || "Failed to load posts. Please try again later."}
			</div>
		);
	}

	if (!posts || posts.length === 0) {
		return <p className='text-center my-4'>No posts in this tab. Switch 👻</p>;
	}

	return (
		<div>
			{posts.map((post) => (
				<Post key={post._id} post={post} />
			))}
		</div>
	);
};
export default Posts;
import { useState } from "react";

const FeedbackPage = () => {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    setLoading(true);
    try {
      const res = await fetch("/api/users/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit feedback");
      setStatus("Thank you for your feedback!");
      setMessage("");
      setEmail("");
    } catch (err) {
      setStatus(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-[4_4_0] border-r border-gray-700 min-h-screen flex flex-col items-center justify-start pt-10">
      <h1 className="text-2xl font-bold mb-4">Feedback</h1>
      <form className="flex flex-col gap-4 w-full max-w-md" onSubmit={handleSubmit}>
        <textarea
          className="textarea w-full p-2 rounded border border-gray-700 bg-[#181818] text-white"
          placeholder="Describe your issue, suggestion, or feedback..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={5}
          required
        />
        <input
          className="input w-full p-2 rounded border border-gray-700 bg-[#181818] text-white"
          placeholder="Your email (optional)"
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="email"
        />
        <button className="btn btn-primary rounded-full text-white px-4 py-2" disabled={loading}>
          {loading ? "Submitting..." : "Submit Feedback"}
        </button>
        {status && <div className="text-center text-sm mt-2 text-blue-400">{status}</div>}
      </form>
    </div>
  );
};

export default FeedbackPage; 
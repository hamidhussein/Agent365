import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, ArrowLeft, Paperclip, Download, Loader2, Sparkles, X, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Agent, ChatMessage } from "../../types";
import { filesApi, API_BASE, authApi } from "../../api";
import { createBotMessage, createUserMessage, updateMessageText } from "../../lib/chatState";
import { MODEL_OPTIONS } from "../../constants";

type InputValue = string | File | null;

const formatBytes = (size: number) => {
	if (size < 1024) return `${size} B`;
	if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
	return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatMessageTime = (value: Date) => {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const ChatInterface = ({ agent, onBack }: { agent: Agent; onBack: () => void }) => {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [isThinking, setIsThinking] = useState(false);
	const [attachment, setAttachment] = useState<{ name: string; content: string } | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [inputValues, setInputValues] = useState<Record<string, InputValue>>({});
	const [inputErrors, setInputErrors] = useState<Record<string, string>>({});
	const [inputsContext, setInputsContext] = useState<string | null>(null);
	const [isCollectingInputs, setIsCollectingInputs] = useState(agent.inputs.length > 0);
	const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const composerRef = useRef<HTMLTextAreaElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const abortControllerRef = useRef<AbortController | null>(null);
	const modelOption = MODEL_OPTIONS.find((m) => m.id === agent.model);

	useEffect(() => {
		abortControllerRef.current?.abort();
		setMessages([createBotMessage(`Hello! I am ${agent.name}. ${agent.description ? agent.description.trim() : ""}`.trim())]);
		setInputValue("");
		setAttachment(null);
		setInputsContext(null);
		setInputErrors({});
		setIsCollectingInputs(agent.inputs.length > 0);
		setLastUserMessage(null);

		const nextValues: Record<string, InputValue> = {};
		for (const field of agent.inputs) {
			nextValues[field.id] = field.type === "file" ? null : "";
		}
		setInputValues(nextValues);
	}, [agent]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, isThinking]);

	const exportConversation = () => {
		const payload = messages.map((msg) => ({ ...msg, timestamp: msg.timestamp.toISOString() }));
		const href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(payload, null, 2))}`;
		const a = document.createElement("a");
		a.href = href;
		a.download = `${agent.name.replace(/\s+/g, "_").toLowerCase()}_chat.json`;
		document.body.appendChild(a);
		a.click();
		a.remove();
	};

	const buildInputsContext = () => {
		const lines = agent.inputs
			.map((field) => {
				const value = inputValues[field.id];
				if (field.type === "file") {
					if (value instanceof File) return `- ${field.label}: ${value.name} (${formatBytes(value.size)})`;
					return null;
				}
				const text = typeof value === "string" ? value.trim() : "";
				return text ? `- ${field.label}: ${text}` : null;
			})
			.filter(Boolean) as string[];
		return lines.length ? `USER INPUTS:\n${lines.join("\n")}` : null;
	};

	const handleStartConversation = () => {
		const nextErrors: Record<string, string> = {};
		for (const field of agent.inputs) {
			if (!field.required) continue;
			const value = inputValues[field.id];
			if (field.type === "file") {
				if (!(value instanceof File)) nextErrors[field.id] = "Required";
			} else if (!value || (typeof value === "string" && !value.trim())) {
				nextErrors[field.id] = "Required";
			}
		}
		setInputErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) return;
		setInputsContext(buildInputsContext());
		setIsCollectingInputs(false);
	};

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setIsUploading(true);
		try {
			const { text } = await filesApi.extractFileText(file);
			setAttachment({ name: file.name, content: text });
		} catch (err) {
			console.error(err);
			alert("Failed to extract text from file.");
		} finally {
			setIsUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const streamResponse = async (message: string, botMessageId: string) => {
		const controller = new AbortController();
		abortControllerRef.current = controller;

		const headers = new Headers({ "Content-Type": "application/json" });
		const token = authApi.getToken();
		if (token) headers.set("Authorization", `Bearer ${token}`);

		const history = messages.filter((m) => m.role !== "model" || m.id !== messages[0]?.id).map((m) => ({ role: m.role === "model" ? "model" : "user", content: m.text }));

		const response = await fetch(`${API_BASE}/api/chat/stream`, {
			method: "POST",
			headers,
			body: JSON.stringify({ agentId: agent.id, message, inputsContext, messages: history }),
			signal: controller.signal,
		});

		if (!response.ok || !response.body) {
			const text = await response.text();
			throw new Error(text || "Request failed");
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";
		let fullText = "";

		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				if (!line.trim()) continue;
				try {
					const event = JSON.parse(line);
					if (event.type === "token") fullText += event.content || "";
					else if (event.type === "error") fullText += `\n[Error] ${event.content || ""}`;
				} catch {
					fullText += line;
				}
			}
			setMessages((prev) => updateMessageText(prev, botMessageId, fullText));
		}

		if (buffer.trim()) {
			try {
				const event = JSON.parse(buffer);
				if (event.type === "token") fullText += event.content || "";
			} catch {
				fullText += buffer;
			}
			setMessages((prev) => updateMessageText(prev, botMessageId, fullText));
		}
	};

	const sendMessage = async (text: string, includeUserMessage = true) => {
		if ((!text.trim() && !attachment) || isThinking) return;

		let messageText = text.trim();
		if (attachment && includeUserMessage) {
			const attachmentBlock = `Attached file: ${attachment.name}\n\n${attachment.content}`;
			messageText = messageText ? `${messageText}\n\n${attachmentBlock}` : attachmentBlock;
			setAttachment(null);
		}

		const botMsg = createBotMessage("");
		setMessages((prev) => (includeUserMessage ? [...prev, createUserMessage(messageText), botMsg] : [...prev, botMsg]));
		setInputValue("");
		setIsThinking(true);

		try {
			await streamResponse(messageText, botMsg.id);
		} catch (error: any) {
			if (error?.name !== "AbortError") {
				setMessages((prev) => updateMessageText(prev, botMsg.id, "I encountered an error processing your request."));
			}
		} finally {
			setIsThinking(false);
			abortControllerRef.current = null;
		}
	};

	const handleSend = async () => {
		if ((!inputValue.trim() && !attachment) || isThinking) return;
		const trimmed = inputValue.trim();
		setLastUserMessage(trimmed || null);
		await sendMessage(inputValue);
	};

	const handleRegenerate = async () => {
		if (!lastUserMessage) return;
		await sendMessage(lastUserMessage, false);
	};

	const creatorCapabilityBadges = useMemo(() => {
		const enabled = agent.enabledCapabilities ?? {
			codeExecution: false,
			webBrowsing: false,
			apiIntegrations: false,
			fileHandling: false,
		};
		return [enabled.fileHandling ? "RAG / Files" : null, enabled.webBrowsing ? "Web Search" : null, enabled.codeExecution ? "Code Execution" : null, enabled.apiIntegrations ? "API Integrations" : null].filter(Boolean) as string[];
	}, [agent.enabledCapabilities]);

	const starterPrompts = useMemo(() => {
		const prompts: string[] = [`How do I get the best results from ${agent.name}?`, "Review my draft and suggest improvements."];
		if (agent.enabledCapabilities?.fileHandling) prompts.push("Upload a file for analysis.");
		if (agent.enabledCapabilities?.webBrowsing) prompts.push("Search the web for latest info.");
		if (agent.enabledCapabilities?.codeExecution) prompts.push("Run a Python example and explain it.");
		return prompts.slice(0, 4);
	}, [agent.name, agent.enabledCapabilities]);

	const canSend = (!!inputValue.trim() || !!attachment) && !isThinking && !isUploading;

	// Auto-grow textarea
	const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInputValue(e.target.value);
		e.target.style.height = "auto";
		e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
	};

	return (
		<div className="flex h-screen w-full overflow-hidden bg-background" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
			{/* ── SIDEBAR (Desktop) ── */}
			<aside className="hidden w-80 flex-col border-r border-border/60 bg-card/50 backdrop-blur-3xl md:flex">
				<div className="flex flex-1 flex-col p-6">
					{/* Header section in sidebar */}
					<div className="mb-8">
						<button onClick={onBack} className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground transition hover:text-foreground">
							<ArrowLeft size={14} />
							<span>Back to Studio</span>
						</button>

						<div className="relative mb-6">
							<div className={`relative flex h-16 w-16 items-center justify-center rounded-[1.5rem] shadow-2xl ring-1 ring-border/50 ${agent.color} text-white`}>
								<div className="absolute -inset-1 animate-pulse rounded-[1.5rem] bg-primary/20 blur-md" />
								<div className="relative z-10">{modelOption?.icon || <Bot size={28} />}</div>
							</div>
						</div>

						<h1 className="text-xl font-extrabold tracking-tight text-foreground">{agent.name}</h1>
						<p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{agent.description || "Private creator agent chat session. Your data is secure and temporary."}</p>
					</div>

					{/* Capabilities section */}
					<div className="space-y-6">
						<div>
							<h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Capabilities</h3>
							<div className="flex flex-wrap gap-2">
								{creatorCapabilityBadges.length > 0 ? (
									creatorCapabilityBadges.map((badge) => (
										<span key={badge} className="rounded-lg border border-border/60 bg-secondary/50 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground shadow-sm transition hover:scale-105 hover:border-primary/30 hover:text-primary">
											{badge}
										</span>
									))
								) : (
									<span className="text-[10px] italic text-muted-foreground">Standard Model</span>
								)}
							</div>
						</div>

						{agent.files.length > 0 && (
							<div>
								<h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Knowledge</h3>
								<div className="rounded-2xl border border-border/60 bg-secondary/30 p-3">
									<div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
										<Paperclip size={12} className="text-primary/60" />
										<span>{agent.files.length} documents indexed</span>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Bottom sidebar actions */}
				<div className="border-t border-border/60 p-6">
					<button onClick={exportConversation} className="group flex w-full items-center justify-between rounded-xl bg-primary px-4 py-3 text-xs font-bold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98] shadow-lg shadow-primary/20">
						<div className="flex items-center gap-2">
							<Download size={14} />
							<span>Export Transcript</span>
						</div>
						<ArrowLeft size={12} className="rotate-180 opacity-0 transition-opacity group-hover:opacity-100" />
					</button>
					<div className="mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Studio • v1.0</div>
				</div>
			</aside>

			{/* ── MAIN CONTENT CANVAS ── */}
			<main className="relative flex flex-1 flex-col min-w-0">
				{/* Mobile Header */}
				<header className="z-40 flex items-center justify-between border-b border-border/60 bg-card/80 px-4 py-3 backdrop-blur-xl md:hidden">
					<div className="flex items-center gap-3">
						<button onClick={onBack} className="p-1 text-muted-foreground">
							<ArrowLeft size={18} />
						</button>
						<div className={`h-8 w-8 rounded-lg ${agent.color} flex items-center justify-center text-white shadow-sm`}>{modelOption?.icon || <Bot size={14} />}</div>
						<span className="text-sm font-bold text-foreground">{agent.name}</span>
					</div>
					<button onClick={exportConversation} className="p-2 text-muted-foreground">
						<Download size={18} />
					</button>
				</header>

				{/* REQUIRED INPUTS FORM OVERLAY */}
				{isCollectingInputs ? (
					<div className="flex flex-1 items-center justify-center p-6 sm:p-12">
						{/* Background blobbie */}
						<div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/10 to-transparent blur-[100px] pointer-events-none" />

						<div className="relative w-full max-w-xl animate-fade-in rounded-3xl border border-border/60 bg-card/90 backdrop-blur-xl p-8 shadow-2xl">
							<div className="mb-6">
								<h2 className="text-2xl font-black tracking-tight text-foreground">Start your session</h2>
								<p className="mt-1 text-sm text-muted-foreground">I need a few details to provide the best assistance.</p>
							</div>

							<div className="grid grid-cols-1 gap-5 md:grid-cols-2">
								{agent.inputs.map((field) => {
									const value = inputValues[field.id];
									const error = inputErrors[field.id];
									const baseInput = "w-full rounded-2xl border bg-secondary/50 px-4 py-3.5 text-sm text-foreground outline-none transition-all duration-300 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 focus:bg-secondary";
									const borderClass = error ? "border-red-500/50" : "border-border/60";

									if (field.type === "textarea")
										return (
											<div key={field.id} className="md:col-span-2">
												<label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-muted-foreground">
													{field.label}
													{field.required && <span className="ml-1 text-red-500">*</span>}
												</label>
												<textarea className={`${baseInput} ${borderClass} min-h-[120px] resize-none`} value={typeof value === "string" ? value : ""} onChange={(e) => setInputValues((p) => ({ ...p, [field.id]: e.target.value }))} placeholder={`What should I know about ${field.label.toLowerCase()}?`} />
												{error && <p className="mt-2 text-[10px] font-bold text-red-500">This field is required</p>}
											</div>
										);

									if (field.type === "file")
										return (
											<div key={field.id}>
												<label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-muted-foreground">
													{field.label}
													{field.required && <span className="ml-1 text-red-500">*</span>}
												</label>
												<div className="relative">
													<input type="file" onChange={(e) => setInputValues((p) => ({ ...p, [field.id]: e.target.files?.[0] || null }))} className="absolute inset-0 z-10 cursor-pointer opacity-0" />
													<div className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/60 bg-secondary/30 p-6 transition-colors ${inputValues[field.id] ? "border-primary/50 bg-primary/5 text-primary" : ""}`}>
														<Paperclip size={20} className="text-muted-foreground/50" />
														<span className="text-[10px] font-bold text-muted-foreground">{inputValues[field.id] instanceof File ? (inputValues[field.id] as File).name : "Drop file or click"}</span>
													</div>
												</div>
												{error && <p className="mt-2 text-[10px] font-bold text-red-500">Please upload a file</p>}
											</div>
										);

									return (
										<div key={field.id}>
											<label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-muted-foreground">
												{field.label}
												{field.required && <span className="ml-1 text-red-500">*</span>}
											</label>
											<input className={`${baseInput} ${borderClass}`} value={typeof value === "string" ? value : ""} onChange={(e) => setInputValues((p) => ({ ...p, [field.id]: e.target.value }))} placeholder={`Enter ${field.label.toLowerCase()}...`} />
											{error && <p className="mt-2 text-[10px] font-bold text-red-500">Required</p>}
										</div>
									);
								})}
							</div>

							<div className="mt-10 flex flex-col-reverse justify-end gap-3 sm:flex-row">
								<button onClick={onBack} className="rounded-2xl border border-border px-6 py-3 text-sm font-bold text-muted-foreground transition-all hover:bg-muted active:scale-95">
									Go Back
								</button>
								<button onClick={handleStartConversation} className="rounded-2xl bg-primary px-8 py-3 text-sm font-black text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95">
									Initialize Agent
								</button>
							</div>
						</div>
					</div>
				) : (
					<>
						{/* ── MESSAGES CANVAS ── */}
						<div className="relative flex-1 overflow-y-auto overflow-x-hidden pt-6">
							{/* Atmospheric Glows */}
							<div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
								<div className={`absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/5 blur-[120px]`} />
								<div className={`absolute bottom-0 left-0 h-64 w-64 rounded-full bg-primary/5 blur-[100px] opacity-60`} />
							</div>

							<div className="relative z-10 mx-auto w-full max-w-3xl px-6 pb-24">
								{/* Discovery prompts — only for first message */}
								{messages.length <= 1 && starterPrompts.length > 0 && (
									<div className="animate-fade-in mb-12">
										<div className="mb-4 flex items-center gap-3">
											<span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/50">Discovery</span>
											<div className="h-px flex-1 bg-gradient-to-r from-border/60 to-transparent" />
										</div>
										<div className="flex flex-wrap gap-2.5">
											{starterPrompts.map((prompt, idx) => (
												<button key={prompt} style={{ animationDelay: `${idx * 100}ms` }} onClick={() => { setInputValue(prompt); composerRef.current?.focus(); }} className="animate-fade-in group flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md px-5 py-3 text-left shadow-sm transition-all duration-300 hover:border-primary/30 hover:bg-primary/5 hover:shadow-primary/5 active:scale-[0.98]">
													<Sparkles size={14} className="text-muted-foreground/40 group-hover:text-primary" />
													<span className="text-xs font-bold text-muted-foreground group-hover:text-foreground">{prompt}</span>
												</button>
											))}
										</div>
									</div>
								)}

								<div className="space-y-10">
                                                                  {messages.map((msg) => (
										<div key={msg.id} className={`animate-fade-in flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
											{msg.role === "model" ? (
												<div className="flex w-full items-start gap-4">
													{/* Minimal model avatar for message list */}
													<div className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${agent.color} text-white opacity-80 shadow-sm`}>{modelOption?.icon || <Bot size={11} />}</div>
													<div className="min-w-0 flex-1">
														<div className="mb-2 flex items-center gap-2">
															<span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{agent.name}</span>
															<span className="text-[10px] font-medium text-muted-foreground/50">{formatMessageTime(msg.timestamp)}</span>
														</div>
														<div className="rounded-3xl rounded-tl-sm border border-border/40 bg-card/70 px-6 py-5 text-[15px] leading-relaxed text-foreground shadow-sm backdrop-blur-md">
															<div className="prose prose-sm max-w-none break-words text-current dark:prose-invert prose-p:my-3 prose-pre:rounded-2xl prose-pre:border prose-pre:border-border/60 prose-pre:bg-secondary/50">
																<ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
															</div>
														</div>
													</div>
												</div>
											) : (
												<div className="max-w-[85%] sm:max-w-[75%]">
													<div className="mb-2 pr-2 text-right text-[10px] font-bold text-muted-foreground/50">{formatMessageTime(msg.timestamp)}</div>
													<div className="rounded-3xl rounded-tr-sm bg-primary px-6 py-4 text-[15px] font-medium leading-relaxed text-primary-foreground shadow-xl shadow-primary/10">
														<div className="whitespace-pre-wrap break-words">{msg.text}</div>
													</div>
												</div>
											)}
										</div>
									))}

									{isThinking && (
										<div className="animate-fade-in flex items-start gap-4">
											<div className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${agent.color} text-white opacity-80 shadow-sm`}>{modelOption?.icon || <Bot size={11} />}</div>
											<div className="relative overflow-hidden rounded-3xl rounded-tl-sm border border-border/40 bg-card/70 px-6 py-4 shadow-sm backdrop-blur-md">
												<div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-primary/5 to-transparent bg-[length:200%_100%] opacity-50" />
												<div className="relative flex items-center gap-2">
													<Loader2 size={16} className="animate-spin text-primary/60" />
													<span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Thinking</span>
												</div>
											</div>
										</div>
									)}

									<div ref={messagesEndRef} />
								</div>
							</div>
						</div>

						{/* ── COMMAND BAR (Floating Bottom) ── */}
						<div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex items-end justify-center px-4 pb-8 pt-20 bg-gradient-to-t from-background via-background/80 to-transparent">
							<div className="pointer-events-auto w-full max-w-3xl">
								{/* Attachment Overlay */}
								{attachment && (
									<div className="animate-fade-in mb-3 flex items-center justify-between gap-3 rounded-[1.5rem] border border-primary/20 bg-primary/5 p-4 backdrop-blur-3xl shadow-lg">
										<div className="flex items-center gap-3">
											<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
												<Paperclip size={18} />
											</div>
											<div>
												<div className="text-xs font-black text-foreground">{attachment.name}</div>
												<div className="text-[10px] text-primary font-bold">File attached successfully</div>
											</div>
										</div>
										<button onClick={() => setAttachment(null)} className="rounded-full bg-secondary/50 p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive active:scale-90">
											<X size={16} />
										</button>
									</div>
								)}

								{/* The Main Input Card */}
								<div className="relative overflow-hidden rounded-[2.5rem] border border-border/60 bg-card/90 p-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] backdrop-blur-3xl transition-all focus-within:border-primary/40 focus-within:shadow-primary/5">
									{/* Integrated Secondary Toolbar */}
									<div className="flex items-center justify-between border-b border-border/40 px-6 py-2 pb-1.5 pt-1">
										<div className="flex items-center gap-1">
											{lastUserMessage && !isThinking && (
												<button onClick={handleRegenerate} className="flex h-8 items-center gap-2 rounded-lg px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition hover:bg-primary/10 hover:text-primary">
													<RefreshCw size={12} />
													<span className="hidden sm:inline">Regenerate</span>
												</button>
											)}
											{agent.enabledCapabilities?.fileHandling && (
												<>
													<input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept=".pdf,.txt,.md,.docx,.html,.csv" />
													<button onClick={() => fileInputRef.current?.click()} disabled={isUploading || isThinking} className="flex h-8 items-center gap-2 rounded-lg px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition hover:bg-primary/10 hover:text-primary">
														{isUploading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
														<span className="hidden sm:inline">Attach</span>
													</button>
												</>
											)}
										</div>
										<div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{agent.name} Session</div>
									</div>

									<div className="flex items-end gap-3 px-6 py-4">
										<textarea
											ref={composerRef}
											value={inputValue}
											onChange={handleTextareaInput}
											onKeyDown={(e) => {
												if (e.key === "Enter" && !e.shiftKey) {
													e.preventDefault();
													void handleSend();
												}
											}}
											rows={1}
											className="max-h-32 min-h-[32px] flex-1 resize-none bg-transparent py-1.5 text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground/40"
											placeholder={`Ask ${agent.name}...`}
											style={{ height: "auto" }}
										/>
										<button onClick={handleSend} disabled={!canSend} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-20">
											{isThinking ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
										</button>
									</div>
								</div>

								{/* Footer hint */}
								<div className="mt-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Enter to send • Shift+Enter for newline</div>
							</div>
						</div>
					</>
				)}
			</main>

			<style>{`
				@keyframes shimmer {
					0% { background-position: -1000px 0; }
					100% { background-position: 1000px 0; }
				}
				.animate-shimmer {
					animation: shimmer 5s infinite linear;
				}
				.animate-fade-in {
					animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
				}
				@keyframes fadeIn {
					from { opacity: 0; transform: translateY(10px); }
					to { opacity: 1; transform: translateY(0); }
				}
				.prose pre {
					background-color: transparent !important;
					padding: 0 !important;
					margin: 0 !important;
				}
				::-webkit-scrollbar {
					width: 6px;
				}
				::-webkit-scrollbar-track {
					background: transparent;
				}
				::-webkit-scrollbar-thumb {
					background: rgba(0,0,0,0.05);
					border-radius: 10px;
				}
				.dark ::-webkit-scrollbar-thumb {
					background: rgba(255,255,255,0.05);
				}
			`}</style>
		</div>
	);
};

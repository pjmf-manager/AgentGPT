import type { ReactNode } from "react";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "next-i18next";
import { FaClipboard, FaImage, FaSave } from "react-icons/fa";
import PopIn from "./motions/popin";
import Expand from "./motions/expand";
import * as htmlToImage from "html-to-image";
import WindowButton from "./WindowButton";
import FadeIn from "./motions/FadeIn";
import Menu from "./Menu";
import type { Message } from "../types/agentTypes";
import {
  getTaskStatus,
  MESSAGE_TYPE_GOAL,
  MESSAGE_TYPE_SYSTEM,
  MESSAGE_TYPE_THINKING,
  TASK_STATUS_COMPLETED,
  TASK_STATUS_EXECUTING,
  TASK_STATUS_FINAL,
  TASK_STATUS_STARTED,
} from "../types/agentTypes";
import clsx from "clsx";
import { getMessageContainerStyle } from "./utils/helpers";
import { AnimatePresence } from "framer-motion";
import { CgExport } from "react-icons/cg";
import { AgentTask } from "../services/agent/autonomous-agent";

interface ChatWindowProps extends HeaderProps {
  children?: ReactNode;
  className?: string;
  fullscreen?: boolean;
  scrollToBottom?: boolean;
  openSorryDialog?: () => void;
  setAgentRun?: (name: string, goal: string) => void;
  visibleOnMobile?: boolean;
  messages: AgentTask[];
}

const messageListId = "chat-window-message-list";

const ChatWindow = ({
  messages,
  children,
  className,
  title,
  onSave,
  fullscreen,
  scrollToBottom,
  openSorryDialog,
  setAgentRun,
  visibleOnMobile,
}: ChatWindowProps) => {
  const [t] = useTranslation();
  const [hasUserScrolled, setHasUserScrolled] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;

    // Use has scrolled if we have scrolled up at all from the bottom
    const hasUserScrolled = scrollTop < scrollHeight - clientHeight - 10;
    setHasUserScrolled(hasUserScrolled);
  };

  useEffect(() => {
    // Scroll to bottom on re-renders
    if (scrollToBottom && scrollRef && scrollRef.current) {
      if (!hasUserScrolled) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  });

  return (
    <div
      className={clsx(
        "border-translucent w-full flex-col rounded-2xl border-2 border-white/20 bg-zinc-900 text-white shadow-2xl drop-shadow-lg xl:flex",
        className,
        visibleOnMobile ? "flex" : "hidden"
      )}
    >
      <MacWindowHeader title={title} messages={messages} onSave={onSave} />
      <div
        className={clsx(
          "mb-2 mr-2 ",
          (fullscreen && "max-h-[75vh] flex-grow overflow-auto") || "window-heights"
        )}
        ref={scrollRef}
        onScroll={handleScroll}
        id={messageListId}
      >
        {messages.map((message, index) => {
          if (getTaskStatus(message) === TASK_STATUS_EXECUTING) {
            return null;
          }

          return (
            <FadeIn key={message.id}>
              <ChatMessage message={message} />
            </FadeIn>
          );
        })}
        {children}

        {messages.length === 0 && (
          <>
            <PopIn delay={0.8}>
              <ChatMessage
                message={{
                  type: MESSAGE_TYPE_SYSTEM,
                  value: "👉 " + t("CREATE_AN_AGENT_DESCRIPTION", { ns: "chat" }),
                }}
              />
            </PopIn>
            <PopIn delay={1.5}>
              <div className="m-2 flex flex-col justify-between gap-2 sm:m-4 sm:flex-row">
                <ExampleAgentButton name="PlatformerGPT 🎮" setAgentRun={setAgentRun}>
                  Write some code to make a platformer game.
                </ExampleAgentButton>
                <ExampleAgentButton name="TravelGPT 🌴" setAgentRun={setAgentRun}>
                  Plan a detailed trip to Hawaii.
                </ExampleAgentButton>
                <ExampleAgentButton name="ResearchGPT 📜" setAgentRun={setAgentRun}>
                  Create a comprehensive report of the Nike company
                </ExampleAgentButton>
              </div>
            </PopIn>
          </>
        )}
      </div>
    </div>
  );
};

const SwitchContainer = ({ label, children }: { label: string; children: React.ReactNode }) => {
  return (
    <div className="m-1 flex w-36 items-center justify-center gap-2 rounded-lg border-[2px] border-white/20 bg-zinc-700 px-2 py-1">
      <p className="font-mono text-sm">{label}</p>
      {children}
    </div>
  );
};

const ExampleAgentButton = ({
  name,
  children,
  setAgentRun,
}: {
  name: string;
  children: string;
  setAgentRun?: (name: string, goal: string) => void;
}) => {
  const handleClick = () => {
    if (setAgentRun) {
      setAgentRun(name, children);
    }
  };

  return (
    <div
      className={clsx(
        `w-full p-2 sm:w-[33%]`,
        `cursor-pointer rounded-lg font-mono text-sm sm:text-base`,
        `border-2 border-white/20 bg-gradient-to-t from-sky-500 to-sky-600 transition-all hover:bg-gradient-to-t hover:from-sky-400 hover:to-sky-600`
      )}
      onClick={handleClick}
    >
      <p className="text-lg font-black">{name}</p>
      <p className="mt-2 text-sm">{children}</p>
    </div>
  );
};

interface HeaderProps {
  title?: string | ReactNode;
  onSave?: (format: string) => void;
}

const MacWindowHeader = (props: HeaderProps) => {
  const [t] = useTranslation();

  const saveElementAsImage = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      return;
    }

    htmlToImage
      .toJpeg(element, {
        height: element.scrollHeight,
        style: {
          overflowY: "visible",
          maxHeight: "none",
          border: "none",
        },
      })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "agent-gpt-output.png";
        link.click();
      })
      .catch(() =>
        alert("Error saving image! Note this doesn't work if the AI generated an image")
      );
  };

  const copyElementText = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      return;
    }

    const text = element.innerText;

    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    } else {
      // Fallback to a different method for unsupported browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand("copy");
        console.log("Text copied to clipboard");
      } catch (err) {
        console.error("Unable to copy text to clipboard", err);
      }

      document.body.removeChild(textArea);
    }
  };

  const exportOptions = [
    <WindowButton
      key="Image"
      onClick={(): void => saveElementAsImage(messageListId)}
      icon={<FaImage size={12} />}
      name={`${t("IMAGE", { ns: "common" })}`}
    />,
    <WindowButton
      key="Copy"
      onClick={(): void => copyElementText(messageListId)}
      icon={<FaClipboard size={12} />}
      name={`${t("COPY", { ns: "common" })}`}
    />,
    // <PDFButton key="PDF" name="PDF" messages={props.messages} />,
  ];

  return (
    <div className="flex items-center gap-1 overflow-visible rounded-t-3xl p-3">
      <PopIn delay={0.4}>
        <div className="h-3 w-3 rounded-full bg-red-500" />
      </PopIn>
      <PopIn delay={0.5}>
        <div className="h-3 w-3 rounded-full bg-yellow-500" />
      </PopIn>
      <PopIn delay={0.6}>
        <div className="h-3 w-3 rounded-full bg-green-500" />
      </PopIn>
      <Expand
        delay={1}
        className="invisible flex flex-grow font-mono text-sm font-bold text-gray-500 sm:ml-2 md:visible"
      >
        {props.title}
      </Expand>

      <AnimatePresence>
        {props.onSave && (
          <PopIn>
            <WindowButton
              ping
              key="Agent"
              onClick={() => props.onSave?.("db")}
              icon={<FaSave size={12} />}
              name={`${t("SAVE", { ns: "common" })}`}
              border
            />
          </PopIn>
        )}
      </AnimatePresence>

      <Menu icon={<CgExport size={15} />} items={exportOptions} />
    </div>
  );
};
const ChatMessage = ({ message }: { message: AgentTask }) => {
  const [t] = useTranslation();

  return (
    <div
      className={clsx(
        getMessageContainerStyle(message),
        "mx-2 my-1 rounded-lg border-[1px] bg-white/20 p-2 font-mono text-xs hover:border-[#1E88E5]/40 sm:mx-4 sm:p-3",
        "sm:my-1.5 sm:text-sm"
      )}
    >
      {message.id}
      <br />
      Goal: {message.input}
      <br />
      Output: {message.output}
      <br />
      {/*{message.type != MESSAGE_TYPE_SYSTEM && (*/}
      {/*  // Avoid for system messages as they do not have an icon and will cause a weird space*/}
      {/*  <>*/}
      {/*    <div className="mr-2 inline-block h-[0.9em]">{getTaskStatusIcon(message, {})}</div>*/}
      {/*    <span className="mr-2 font-bold">{t(getMessagePrefix(message), { ns: "chat" })}</span>*/}
      {/*  </>*/}
      {/*)}*/}
      {/*{message.type == MESSAGE_TYPE_THINKING && (*/}
      {/*  <span className="italic text-zinc-400">*/}
      {/*    {`${t("RESTART_IF_IT_TAKES_X_SEC", {*/}
      {/*      ns: "chat",*/}
      {/*    })}`}*/}
      {/*  </span>*/}
      {/*)}*/}
      {/*{isAction(message) ? (*/}
      {/*  <>*/}
      {/*    <hr className="my-2 border-[1px] border-white/20" />*/}
      {/*    <div className="prose">*/}
      {/*      <MarkdownRenderer>{message.info || ""}</MarkdownRenderer>*/}
      {/*    </div>*/}
      {/*  </>*/}
      {/*) : (*/}
      {/*  <>*/}
      {/*    <span>{t(message.value, { ns: "chat" })}</span>*/}
      {/*    {*/}
      {/*      // Link to the FAQ if it is a shutdown message*/}
      {/*      message.type == MESSAGE_TYPE_SYSTEM &&*/}
      {/*        (message.value.toLowerCase().includes("shut") ||*/}
      {/*          message.value.toLowerCase().includes("error")) && <FAQ />*/}
      {/*    }*/}
      {/*  </>*/}
      {/*)}*/}
    </div>
  );
};

// Returns the translation key of the prefix
const getMessagePrefix = (message: Message) => {
  if (message.type === MESSAGE_TYPE_GOAL) {
    return "EMBARKING_ON_NEW_GOAL";
  } else if (message.type === MESSAGE_TYPE_THINKING) {
    return "THINKING";
  } else if (getTaskStatus(message) === TASK_STATUS_STARTED) {
    return "TASK_ADDED";
  } else if (getTaskStatus(message) === TASK_STATUS_COMPLETED) {
    return `Completing: ${message.value}`;
  } else if (getTaskStatus(message) === TASK_STATUS_FINAL) {
    return "NO_MORE_TASKS";
  }
  return "";
};

const FAQ = () => {
  return (
    <p>
      <br />
      If you are facing issues, please head over to our{" "}
      <a href="https://docs.reworkd.ai/faq" className="text-sky-500">
        FAQ
      </a>
    </p>
  );
};
export default ChatWindow;
export { ChatMessage };

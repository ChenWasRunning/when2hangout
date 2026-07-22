import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { AppApi, StatsResponse, SubmitPayload } from "./types";

function createApi(overrides: Partial<AppApi> = {}): AppApi {
  const emptyStats: StatsResponse = {
    totalSubmissions: 0,
    slots: [],
  };

  return {
    getMySubmission: vi.fn().mockResolvedValue(null),
    submitAvailability: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockResolvedValue(emptyStats),
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
  vi.restoreAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

function firstSlot(testId: string): HTMLElement {
  return screen.getAllByTestId(testId)[0] as HTMLElement;
}

describe("App 提交流程", () => {
  it("点击提交前不会调用后台保存接口，点击提交后才调用", async () => {
    const user = userEvent.setup();
    const api = createApi();
    render(<App api={api} />);

    await user.click(firstSlot("slot-2026-07-27:lunch"));
    expect(api.submitAvailability).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("你的名字"), "小陈");
    await user.click(screen.getByRole("button", { name: "提交时间" }));

    await waitFor(() => expect(api.submitAvailability).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(api.submitAvailability).mock.calls[0]?.[0] as SubmitPayload;
    expect(payload.displayName).toBe("小陈");
    expect(payload.slots).toEqual([{ date: "2026-07-27", meal: "lunch" }]);
  });

  it("可以按住拖过多个格子进行涂抹选择", () => {
    const api = createApi();
    render(<App api={api} />);

    fireEvent.pointerDown(firstSlot("slot-2026-07-30:lunch"));
    fireEvent.pointerEnter(firstSlot("slot-2026-07-31:lunch"));
    fireEvent.pointerUp(window);

    expect(firstSlot("slot-2026-07-30:lunch")).toHaveAttribute("aria-pressed", "true");
    expect(firstSlot("slot-2026-07-31:lunch")).toHaveAttribute("aria-pressed", "true");
    expect(api.submitAvailability).not.toHaveBeenCalled();
  });

  it("可以一键选中 7/30 到 8/6 的午餐和晚餐", async () => {
    const user = userEvent.setup();
    const api = createApi();
    render(<App api={api} />);

    await user.click(screen.getByRole("button", { name: "选中这段时间" }));
    await user.type(screen.getByLabelText("你的名字"), "小陈");
    await user.click(screen.getByRole("button", { name: "提交时间" }));

    await waitFor(() => expect(api.submitAvailability).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(api.submitAvailability).mock.calls[0]?.[0] as SubmitPayload;
    expect(payload.slots).toHaveLength(16);
    expect(payload.slots[0]).toEqual({ date: "2026-07-30", meal: "lunch" });
    expect(payload.slots.at(-1)).toEqual({ date: "2026-08-06", meal: "dinner" });
  });

  it("清空所有选择前会确认，确认后清空且不会自动提交", async () => {
    const user = userEvent.setup();
    const api = createApi();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<App api={api} />);

    await user.click(screen.getByRole("button", { name: "选中这段时间" }));
    expect(firstSlot("slot-2026-07-30:lunch")).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "清空所有选择" }));

    expect(confirmSpy).toHaveBeenCalledWith("是否要清空所有已选日期？");
    expect(firstSlot("slot-2026-07-30:lunch")).toHaveAttribute("aria-pressed", "false");
    expect(firstSlot("slot-2026-08-06:dinner")).toHaveAttribute("aria-pressed", "false");
    expect(api.submitAvailability).not.toHaveBeenCalled();
  });

  it("未填写姓名时不能提交", async () => {
    const user = userEvent.setup();
    const api = createApi();
    render(<App api={api} />);

    await user.click(screen.getByRole("button", { name: "提交时间" }));

    expect(await screen.findByText("请输入你的名字")).toBeInTheDocument();
    expect(api.submitAvailability).not.toHaveBeenCalled();
  });

  it("只输入空格时不能提交", async () => {
    const user = userEvent.setup();
    const api = createApi();
    render(<App api={api} />);

    await user.type(screen.getByLabelText("你的名字"), "   ");
    await user.click(screen.getByRole("button", { name: "提交时间" }));

    expect(await screen.findByText("请输入你的名字")).toBeInTheDocument();
    expect(api.submitAvailability).not.toHaveBeenCalled();
  });

  it("姓名超过30个字符时不能提交", async () => {
    const user = userEvent.setup();
    const api = createApi();
    render(<App api={api} />);

    await user.type(screen.getByLabelText("你的名字"), "一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一");
    await user.click(screen.getByRole("button", { name: "提交时间" }));

    expect(await screen.findByText("名字不能超过30个字符")).toBeInTheDocument();
    expect(api.submitAvailability).not.toHaveBeenCalled();
  });

  it("重复点击提交按钮不会产生重复请求", async () => {
    const user = userEvent.setup();
    let resolveSubmit: (() => void) | undefined;
    const api = createApi({
      submitAvailability: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve;
          }),
      ),
    });
    render(<App api={api} />);

    await user.type(screen.getByLabelText("你的名字"), "小王");
    await user.click(screen.getByRole("button", { name: "提交时间" }));
    await user.click(screen.getByRole("button", { name: "正在提交……" }));

    expect(api.submitAvailability).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveSubmit?.();
    });
  });

  it("提交成功后显示成功状态", async () => {
    const user = userEvent.setup();
    const api = createApi();
    render(<App api={api} />);

    await user.type(screen.getByLabelText("你的名字"), "小李");
    await user.click(screen.getByRole("button", { name: "提交时间" }));

    expect(await screen.findByText("提交成功，感谢你的填写！")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "修改我的选择" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查看统计结果" })).toBeInTheDocument();
  });

  it("提交失败后保留当前表单", async () => {
    const user = userEvent.setup();
    const api = createApi({
      submitAvailability: vi.fn().mockRejectedValue(new Error("network")),
    });
    render(<App api={api} />);

    await user.click(firstSlot("slot-2026-07-27:dinner"));
    await user.type(screen.getByLabelText("你的名字"), "小张");
    await user.click(screen.getByRole("button", { name: "提交时间" }));

    expect(await screen.findByText("提交失败，请重试")).toBeInTheDocument();
    expect(screen.getByLabelText("你的名字")).toHaveValue("小张");
    expect(firstSlot("slot-2026-07-27:dinner")).toHaveAttribute("aria-pressed", "true");
  });

  it("已有 participant token 时能够恢复此前结果", async () => {
    localStorage.setItem("when2hangout.participantToken", "a".repeat(64));
    const api = createApi({
      getMySubmission: vi.fn().mockResolvedValue({
        displayName: "旧名字",
        slots: [{ date: "2026-07-27", meal: "lunch" }],
      }),
    });

    render(<App api={api} />);

    expect(await screen.findByDisplayValue("旧名字")).toBeInTheDocument();
    expect(firstSlot("slot-2026-07-27:lunch")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "更新提交" })).toBeInTheDocument();
  });

  it("更新提交时能够用新结果替换旧结果", async () => {
    localStorage.setItem("when2hangout.participantToken", "b".repeat(64));
    const api = createApi({
      getMySubmission: vi.fn().mockResolvedValue({
        displayName: "小赵",
        slots: [{ date: "2026-07-27", meal: "lunch" }],
      }),
    });
    const user = userEvent.setup();
    render(<App api={api} />);

    await screen.findByDisplayValue("小赵");
    await user.click(firstSlot("slot-2026-07-27:lunch"));
    await user.click(firstSlot("slot-2026-07-28:dinner"));
    await user.click(screen.getByRole("button", { name: "更新提交" }));

    await waitFor(() => expect(api.submitAvailability).toHaveBeenCalledTimes(1));
    const payload = vi.mocked(api.submitAvailability).mock.calls[0]?.[0] as SubmitPayload;
    expect(payload.slots).toEqual([{ date: "2026-07-28", meal: "dinner" }]);
  });
});

"use client";

import React, { useMemo, useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { FaCrown } from "react-icons/fa";
type Cell = "B" | "W" | null;
type Player = "B" | "W";

type MoveRecord = {
  game: number;
  winner: "黒" | "白" | "引き分け";
  duration: string;
};

const BOARD_SIZE = 8;
const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const;

function createInitialBoard(): Cell[][] {
  const board = Array.from({ length: BOARD_SIZE }, () =>
    Array<Cell>(BOARD_SIZE).fill(null),
  );

  board[3][3] = "W";
  board[3][4] = "B";
  board[4][3] = "B";
  board[4][4] = "W";

  return board;
}

function isInsideBoard(row: number, col: number) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getOpponent(player: Player): Player {
  return player === "B" ? "W" : "B";
}

function getFlips(board: Cell[][], row: number, col: number, player: Player) {
  if (board[row][col] !== null) return [] as [number, number][];

  const opponent = getOpponent(player);
  const flips: [number, number][] = [];

  for (const [dr, dc] of DIRECTIONS) {
    let r = row + dr;
    let c = col + dc;
    const temp: [number, number][] = [];

    while (isInsideBoard(r, c) && board[r][c] === opponent) {
      temp.push([r, c]);
      r += dr;
      c += dc;
    }

    if (temp.length > 0 && isInsideBoard(r, c) && board[r][c] === player) {
      flips.push(...temp);
    }
  }

  return flips;
}

function getValidMoves(board: Cell[][], player: Player) {
  const moves: [number, number][] = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (getFlips(board, row, col, player).length > 0) {
        moves.push([row, col]);
      }
    }
  }

  return moves;
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getElapsedDuration(startTime: number) {
  return formatDuration(Date.now() - startTime);
}

function applyMove(board: Cell[][], row: number, col: number, player: Player) {
  const flips = getFlips(board, row, col, player);
  if (flips.length === 0) return null;

  const nextBoard = board.map((line) => [...line]);
  nextBoard[row][col] = player;

  for (const [r, c] of flips) {
    nextBoard[r][c] = player;
  }

  return { nextBoard, flippedCount: flips.length };
}

export default function Page() {
  const [open, setOpen] = useState(false)
  const [board, setBoard] = useState<Cell[][]>(createInitialBoard);
  const [currentPlayer, setCurrentPlayer] = useState<Player>("B");
  const [history, setHistory] = useState<MoveRecord[]>([]);
  const [startTime, setStartTime] = useState<number>(() => Date.now());
  const [message, setMessage] = useState("黒の番です");
  const [passCount, setPassCount] = useState(0);

  const blackCount = useMemo(
    () => board.flat().filter((cell) => cell === "B").length,
    [board],
  );
  const whiteCount = useMemo(
    () => board.flat().filter((cell) => cell === "W").length,
    [board],
  );

  const currentValidMoves = useMemo(
    () => getValidMoves(board, currentPlayer),
    [board, currentPlayer],
  );

  const gameFinished = useMemo(() => {
    const blackMoves = getValidMoves(board, "B");
    const whiteMoves = getValidMoves(board, "W");
    return blackMoves.length === 0 && whiteMoves.length === 0;
  }, [board]);

  const winnerText = useMemo(() => {
    if (!gameFinished) return null;
    setOpen(true);
    if (blackCount > whiteCount)
      return {
        text: `ゲーム終了：黒の勝ち (${blackCount - whiteCount}差)`,
        color: "text-blue-600",
      };
    if (whiteCount > blackCount)
      return {
        text: `ゲーム終了：白の勝ち (${whiteCount - blackCount}差)`,
        color: "text-red-600",
      };
    return {
      text: `ゲーム終了：引き分け (${blackCount} - ${whiteCount})`,
      color: "text-gray-600",
    };
  }, [blackCount, whiteCount, gameFinished]);

  const addHistory = (winner: "黒" | "白" | "引き分け", duration: string) => {
    setHistory((prev) => [
      ...prev,
      {
        game: prev.length + 1,
        winner,
        duration,
      },
    ]);
  };

  const handleCellClick = (row: number, col: number) => {
    if (gameFinished) return;

    const result = applyMove(board, row, col, currentPlayer);
    if (!result) return;

    const nextPlayer = getOpponent(currentPlayer);
    const nextPlayerMoves = getValidMoves(result.nextBoard, nextPlayer);
    const currentPlayerMovesAfter = getValidMoves(
      result.nextBoard,
      currentPlayer,
    );

    setBoard(result.nextBoard);

    const black = result.nextBoard.flat().filter((c) => c === "B").length;
    const white = result.nextBoard.flat().filter((c) => c === "W").length;

    const noMoves =
      getValidMoves(result.nextBoard, "B").length === 0 &&
      getValidMoves(result.nextBoard, "W").length === 0;

    if (noMoves) {
      let resultText: "黒" | "白" | "引き分け";

      if (black > white) resultText = "黒";
      else if (white > black) resultText = "白";
      else resultText = "引き分け";

      addHistory(resultText, getElapsedDuration(startTime));
    }

    if (nextPlayerMoves.length > 0) {
      setCurrentPlayer(nextPlayer);
      setPassCount(0);
      setMessage(`${nextPlayer === "B" ? "黒" : "白"}の番です`);
      return;
    }

    if (currentPlayerMovesAfter.length > 0) {
      setCurrentPlayer(currentPlayer);
      setPassCount((prev) => prev + 1);
      setMessage(
        `${nextPlayer === "B" ? "黒" : "白"}は置ける場所がないためパス。${
          currentPlayer === "B" ? "黒" : "白"
        }の番です`,
      );
      return;
    }

    setPassCount(2);
    setMessage("両者とも置けないためゲーム終了です");
  };

  const handlePass = () => {
    if (gameFinished) return;
    if (currentValidMoves.length > 0) return;

    const nextPlayer = getOpponent(currentPlayer);
    const nextPlayerMoves = getValidMoves(board, nextPlayer);

    if (nextPlayerMoves.length === 0) {
      const black = board.flat().filter((c) => c === "B").length;
      const white = board.flat().filter((c) => c === "W").length;
      let resultText: "黒" | "白" | "引き分け";

      if (black > white) resultText = "黒";
      else if (white > black) resultText = "白";
      else resultText = "引き分け";

      addHistory(resultText, getElapsedDuration(startTime));
      setPassCount(2);
      setMessage("両者とも置けないためゲーム終了です");
      return;
    }

    setCurrentPlayer(nextPlayer);
    setPassCount((prev) => prev + 1);
    setMessage(
      `${currentPlayer === "B" ? "黒" : "白"}がパス。${nextPlayer === "B" ? "黒" : "白"}の番です`,
    );
  };

  const handleReset = () => {
    setBoard(createInitialBoard());
    setCurrentPlayer("B");
    setStartTime(Date.now());
    setMessage("黒の番です");
    setPassCount(0);
  };

  const showHint = (row: number, col: number) => {
    return currentValidMoves.some(([r, c]) => r === row && c === col);
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-3xl font-bold text-slate-800">
          オセロ 2P 対戦
        </h1>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl bg-white p-4 shadow-lg md:p-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-800">
                  {gameFinished ? winnerText?.text : message}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  同じ端末で交互にプレイできます
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handlePass}
                  disabled={gameFinished || currentValidMoves.length > 0}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  パス
                </button>
                <button
                  onClick={handleReset}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  リセット
                </button>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">現在の手番</p>
                <p className="mt-1 text-xl font-bold text-slate-800">
                  {currentPlayer === "B" ? "黒" : "白"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">黒</p>
                <p className="mt-1 text-xl font-bold text-slate-800">
                  {blackCount}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">白</p>
                <p className="mt-1 text-xl font-bold text-slate-800">
                  {whiteCount}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="mx-auto w-fit rounded-2xl bg-emerald-900 p-3 shadow-inner">
                <div className="grid grid-cols-[24px_repeat(8,1fr)] gap-1 md:grid-cols-[28px_repeat(8,1fr)]">
                  <div />
                  {Array.from({ length: BOARD_SIZE }).map((_, col) => (
                    <div
                      key={`col-${col}`}
                      className="flex h-8 w-8 items-center justify-center text-xs font-bold text-white md:h-12 md:w-12 md:text-sm"
                    >
                      {"ABCDEFGH"[col]}
                    </div>
                  ))}

                  {board.map((row, rowIndex) => (
                    <>
                      <div
                        key={`row-label-${rowIndex}`}
                        className="flex h-8 w-8 items-center justify-center text-xs font-bold text-white md:h-12 md:w-12 md:text-sm"
                      >
                        {rowIndex + 1}
                      </div>

                      {row.map((cell, colIndex) => {
                        const hint = showHint(rowIndex, colIndex);

                        return (
                          <button
                            key={`${rowIndex}-${colIndex}`}
                            onClick={() => handleCellClick(rowIndex, colIndex)}
                            disabled={gameFinished}
                            className="relative flex h-8 w-8 items-center justify-center rounded-sm border border-emerald-950 bg-emerald-600 transition hover:bg-emerald-500 disabled:cursor-default md:h-12 md:w-12"
                          >
                            {cell && (
                              <span
                                className={`block rounded-full shadow-md ${
                                  cell === "B"
                                    ? "bg-slate-900"
                                    : "bg-white ring-1 ring-slate-300"
                                } h-6 w-6 md:h-9 md:w-9`}
                              />
                            )}

                            {!cell && hint && (
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-200/80 md:h-3 md:w-3" />
                            )}
                          </button>
                        );
                      })}
                    </>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-2xl bg-white p-4 shadow-lg md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">プレイ履歴</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                {history.length} 数
              </span>
            </div>

            <div className="mb-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p>1列目: プレイ回数</p>
              <p>2列目: 勝利したユーザー</p>
              <p>3列目: プレイ時間</p>
            </div>

            <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
              {history.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  まだプレイが記録されていません
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.game}
                    className="grid grid-cols-[56px_56px_1fr] items-center gap-3 rounded-2xl border border-slate-200 p-3"
                  >
                    <div className="text-sm font-bold text-slate-700">
                      #{item.game}
                    </div>
                    <div
                      className={`inline-flex w-fit rounded-full py-5 text-xs font-bold`}
                    >
                      勝者: {item.winner}
                    </div>
                    <div className="text-sm text-slate-700">
                      <span className="ml-2 text-slate-500">
                        時間: {item.duration}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {(gameFinished || passCount >= 2) && (
              <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                {winnerText?.text || "ゲーム終了"}
              </div>
            )}
          </aside>
        </div>
      </div>
      <div>
      <Dialog open={open} onClose={setOpen} className="relative z-10">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg data-closed:sm:translate-y-0 data-closed:sm:scale-95"
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-yellow-100 sm:mx-0 sm:size-10">
                    <FaCrown aria-hidden="true" className="size-6 text-yellow-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <DialogTitle as="h3" className="text-base font-semibold text-gray-900">
                      {`${currentPlayer === "B" ? "黒" : "白"}の勝ち！`}
                    </DialogTitle>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        ゲームが終了しました。リセットして新しいゲームを始めましょう。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  data-autofocus
                  onClick={() => setOpen(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                >
                  閉じる
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </div>
    </main>
  );
}

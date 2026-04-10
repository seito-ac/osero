"use client";

import React, { useMemo, useState } from "react";

type Cell = "B" | "W" | null;
type Player = "B" | "W";

type MoveRecord = {
  move: number;
  player: "黒" | "白";
  position: string;
  flipped: number;
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

function toPosition(row: number, col: number) {
  const letters = "ABCDEFGH";
  return `${letters[col]}${row + 1}`;
}

export default function Page() {
  const [board, setBoard] = useState<Cell[][]>(createInitialBoard);
  const [currentPlayer, setCurrentPlayer] = useState<Player>("B");
  const [history, setHistory] = useState<MoveRecord[]>([]);
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

  const addHistory = (
    row: number,
    col: number,
    flippedCount: number,
    result?: "黒勝ち" | "白勝ち" | "引き分け",
  ) => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    setHistory((prev) => [
      ...prev,
      {
        move: prev.length + 1,
        player: currentPlayer === "B" ? "黒" : "白",
        position: toPosition(row, col),
        flipped: flippedCount,
        time: `${hours}:${minutes}:${seconds}`,
        result,
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
      let resultText: "黒勝ち" | "白勝ち" | "引き分け";

      if (black > white) resultText = "黒勝ち";
      else if (white > black) resultText = "白勝ち";
      else resultText = "引き分け";

      addHistory(row, col, result.flippedCount, resultText);
    } else {
      addHistory(row, col, result.flippedCount);
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
    setHistory([]);
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
                  {gameFinished ? winnerText : message}
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
              <h2 className="text-xl font-bold text-slate-800">対戦履歴</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                {history.length} 手
              </span>
            </div>

            <div className="mb-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p>1列目: 手数</p>
              <p>2列目: プレイヤー</p>
              <p>3列目: 置いた場所 / 反転数</p>
            </div>

            <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
              {history.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  まだ手は記録されていません
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.move}
                    className="grid grid-cols-[56px_56px_1fr] items-center gap-3 rounded-2xl border border-slate-200 p-3"
                  >
                    <div className="text-sm font-bold text-slate-700">
                      #{item.move}
                    </div>
                    <div
                      className={`inline-flex w-fit rounded-full py-5 text-xs font-bold`}
                    >
                      勝者: {item.player}
                    </div>
                    <div className="text-sm text-slate-700">
                      <span className="ml-2 text-slate-500">
                        時間: {item.time}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {(gameFinished || passCount >= 2) && (
              <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                {winnerText || "ゲーム終了"}
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

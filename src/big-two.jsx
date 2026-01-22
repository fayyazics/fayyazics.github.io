import React, { useState, useEffect, useCallback } from 'react';
import { Spade, Heart, Diamond, Club, Users, LogOut, Copy, Check, Crown, Trophy } from 'lucide-react';
import { supabase, getPartyData, setPartyData, deleteParty } from './config/supabase';

const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

const SUIT_ICONS = {
  spades: Spade,
  hearts: Heart,
  diamonds: Diamond,
  clubs: Club
};

const getSuitColor = (suit) => {
  return suit === 'hearts' || suit === 'diamonds' ? '#ef4444' : '#1e293b';
};

const generateDeck = () => {
  const deck = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({ suit, rank, id: `${suit}-${rank}` });
    });
  });
  return deck;
};

const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const getCardValue = (card) => {
  const rankValue = RANKS.indexOf(card.rank);
  const suitValue = SUITS.indexOf(card.suit);
  return rankValue * 4 + suitValue;
};

const compareCards = (card1, card2) => {
  return getCardValue(card1) - getCardValue(card2);
};

const getHandType = (cards) => {
  if (cards.length === 1) return { type: 'single', rank: RANKS.indexOf(cards[0].rank) };
  if (cards.length === 2) {
    if (cards[0].rank === cards[1].rank) {
      return { type: 'pair', rank: RANKS.indexOf(cards[0].rank) };
    }
    return null;
  }
  if (cards.length === 5) {
    const ranks = cards.map(c => RANKS.indexOf(c.rank)).sort((a, b) => a - b);
    const suits = cards.map(c => c.suit);
    const isFlush = suits.every(s => s === suits[0]);
    const isStraight = ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1);
    
    const rankCounts = {};
    cards.forEach(c => {
      rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
    });
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    
    if (isStraight && isFlush) return { type: 'straight-flush', rank: Math.max(...ranks) };
    if (counts[0] === 4) return { type: 'four-of-a-kind', rank: RANKS.indexOf(Object.keys(rankCounts).find(k => rankCounts[k] === 4)) };
    if (counts[0] === 3 && counts[1] === 2) return { type: 'full-house', rank: RANKS.indexOf(Object.keys(rankCounts).find(k => rankCounts[k] === 3)) };
    if (isFlush) return { type: 'flush', rank: Math.max(...ranks) };
    if (isStraight) return { type: 'straight', rank: Math.max(...ranks) };
    
    return null;
  }
  return null;
};

const canBeatHand = (newCards, currentPlay) => {
  if (!currentPlay) return true;
  
  const newHand = getHandType(newCards);
  const currentHand = getHandType(currentPlay.cards);
  
  if (!newHand || newCards.length !== currentPlay.cards.length) return false;
  
  if (newCards.length === 5) {
    const fiveCardRanking = ['straight', 'flush', 'full-house', 'four-of-a-kind', 'straight-flush'];
    const newTypeRank = fiveCardRanking.indexOf(newHand.type);
    const currentTypeRank = fiveCardRanking.indexOf(currentHand.type);
    
    if (newTypeRank > currentTypeRank) return true;
    if (newTypeRank < currentTypeRank) return false;
    return newHand.rank > currentHand.rank;
  }
  
  if (newHand.type !== currentHand.type) return false;
  if (newHand.rank > currentHand.rank) return true;
  if (newHand.rank === currentHand.rank && newCards.length === 1) {
    return getCardValue(newCards[0]) > getCardValue(currentPlay.cards[0]);
  }
  if (newHand.rank === currentHand.rank && newCards.length === 2) {
    const newMax = Math.max(getCardValue(newCards[0]), getCardValue(newCards[1]));
    const currentMax = Math.max(getCardValue(currentPlay.cards[0]), getCardValue(currentPlay.cards[1]));
    return newMax > currentMax;
  }
  
  return false;
};

const BigTwo = () => {
  const [gameState, setGameState] = useState('menu');
  const [partyId, setPartyId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [currentPlayerName, setCurrentPlayerName] = useState('');
  const [players, setPlayers] = useState([]);
  const [myHand, setMyHand] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [currentPlay, setCurrentPlay] = useState(null);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [roundWinner, setRoundWinner] = useState(null);
  const [passedPlayers, setPassedPlayers] = useState([]);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [finishedPlayers, setFinishedPlayers] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [isSoloMode, setIsSoloMode] = useState(false);
  const [playHistory, setPlayHistory] = useState([]);
  const [playError, setPlayError] = useState('');

  const createParty = async () => {
    if (!playerName.trim()) {
      alert('Please enter your name first');
      return;
    }
    
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    setPartyId(id);
    setCurrentPlayerName(playerName.trim());
    
    try {
      const newParty = {
        id: id,
        players: [{ name: playerName.trim(), hand: [], finished: false }],
        gameStarted: false,
        currentPlay: null,
        currentTurn: 0,
        roundWinner: null,
        passedPlayers: [],
        finishedPlayers: [],
        rankings: [],
        playHistory: []
      };
      await setPartyData(id, newParty);
      setGameState('lobby');
      loadPartyData();
    } catch (error) {
      console.error('Error creating party:', error);
      alert('Failed to create party. Please try again.');
    }
  };

  const startSoloGame = () => {
    const id = 'SOLO-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setPartyId(id);
    setIsSoloMode(true);
    setCurrentPlayerName('You');
    
    const aiPlayers = [
      { name: 'You', hand: [], finished: false, isAI: false },
      { name: 'AI Player 1', hand: [], finished: false, isAI: true },
      { name: 'AI Player 2', hand: [], finished: false, isAI: true },
      { name: 'AI Player 3', hand: [], finished: false, isAI: true }
    ];
    
    setPlayers(aiPlayers);
    setGameState('game');
    
    // Start the game immediately
    const deck = shuffleDeck(generateDeck());
    const cardsPerPlayer = 13;
    
    const updatedPlayers = aiPlayers.map((player, index) => {
      const hand = deck.slice(index * cardsPerPlayer, (index + 1) * cardsPerPlayer)
        .sort(compareCards);
      return { ...player, hand };
    });
    
    const starterIndex = updatedPlayers.findIndex(p => 
      p.hand.some(c => c.suit === 'clubs' && c.rank === '3')
    );
    
    setPlayers(updatedPlayers);
    setMyHand(updatedPlayers[0].hand);
    setCurrentTurn(starterIndex >= 0 ? starterIndex : 0);
    setGameStarted(true);
    setPlayHistory([]);
    
    // If AI starts, trigger AI move
    if (starterIndex > 0) {
      setTimeout(() => aiPlayTurn(updatedPlayers, starterIndex, null, null, [], [], [], []), 1500);
    }
  };

  const joinParty = async () => {
    if (!partyId || !playerName.trim()) return;
    
    try {
      const partyData = await getPartyData(partyId);
      
      if (partyData) {
        if (partyData.players.length >= 4) {
          alert('Party is full (max 4 players)');
          return;
        }
        if (partyData.players.some(p => p.name === playerName.trim())) {
          alert('Name already taken in this party');
          return;
        }
        partyData.players.push({ name: playerName.trim(), hand: [], finished: false });
        await setPartyData(partyId, partyData);
      } else {
        const newParty = {
          id: partyId,
          players: [{ name: playerName.trim(), hand: [], finished: false }],
          gameStarted: false,
          currentPlay: null,
          currentTurn: 0,
          roundWinner: null,
          passedPlayers: [],
          finishedPlayers: [],
          rankings: []
        };
        await setPartyData(partyId, newParty);
      }
      
      setCurrentPlayerName(playerName.trim());
      setGameState('lobby');
      loadPartyData();
    } catch (error) {
      console.error('Error joining party:', error);
      alert('Failed to join party. Please check the game ID and try again.');
    }
  };

  const loadPartyData = useCallback(async () => {
    if (!partyId) return;
    
    try {
      const partyData = await getPartyData(partyId);
      
      if (partyData) {
        setPlayers(partyData.players);
        setGameStarted(partyData.gameStarted || false);
        setCurrentPlay(partyData.currentPlay);
        setCurrentTurn(partyData.currentTurn || 0);
        setRoundWinner(partyData.roundWinner);
        setPassedPlayers(partyData.passedPlayers || []);
        setFinishedPlayers(partyData.finishedPlayers || []);
        setRankings(partyData.rankings || []);
        setPlayHistory(partyData.playHistory || []);
        
        const myPlayer = partyData.players.find(p => p.name === currentPlayerName);
        if (myPlayer) {
          setMyHand(myPlayer.hand || []);
          if (myPlayer.finished && gameState !== 'finished') {
            setGameState('finished');
          }
        }
        
        if (partyData.gameStarted && gameState === 'lobby') {
          setGameState('game');
        }
      }
    } catch (error) {
      console.error('Error loading party data:', error);
    }
  }, [partyId, currentPlayerName, gameState]);

  // Real-time subscription for multiplayer
  useEffect(() => {
    if ((gameState === 'lobby' || gameState === 'game' || gameState === 'finished') && !isSoloMode && partyId) {
      const channel = supabase
        .channel(`party:${partyId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'game_parties',
          filter: `id=eq.${partyId}`
        }, (payload) => {
          loadPartyData();
        })
        .subscribe();
      
      // Poll as backup every 2 seconds
      const interval = setInterval(loadPartyData, 2000);
      
      return () => {
        channel.unsubscribe();
        clearInterval(interval);
      };
    }
  }, [gameState, partyId, isSoloMode, loadPartyData]);

  const startGame = async () => {
    if (players.length < 3 || players.length > 4) return;
    
    const deck = shuffleDeck(generateDeck());
    const cardsPerPlayer = Math.floor(52 / players.length);
    
    const updatedPlayers = players.map((player, index) => {
      const hand = deck.slice(index * cardsPerPlayer, (index + 1) * cardsPerPlayer)
        .sort(compareCards);
      return { ...player, hand, finished: false };
    });
    
    const starterIndex = updatedPlayers.findIndex(p => 
      p.hand.some(c => c.suit === 'clubs' && c.rank === '3')
    );
    
    const partyData = {
      id: partyId,
      players: updatedPlayers,
      gameStarted: true,
      currentPlay: null,
      currentTurn: starterIndex >= 0 ? starterIndex : 0,
      roundWinner: null,
      passedPlayers: [],
      finishedPlayers: [],
      rankings: [],
      playHistory: []
    };
    
    await setPartyData(partyId, partyData);
    setGameStarted(true);
    setGameState('game');
    loadPartyData();
  };

  const startNewGame = async () => {
    if (players.length < 3 || players.length > 4) return;
    
    // Reset all players to not finished
    const resetPlayers = players.map(player => ({
      ...player,
      hand: [],
      finished: false
    }));
    
    // Shuffle and deal new cards
    const deck = shuffleDeck(generateDeck());
    const cardsPerPlayer = Math.floor(52 / resetPlayers.length);
    
    const updatedPlayers = resetPlayers.map((player, index) => {
      const hand = deck.slice(index * cardsPerPlayer, (index + 1) * cardsPerPlayer)
        .sort(compareCards);
      return { ...player, hand, finished: false };
    });
    
    const starterIndex = updatedPlayers.findIndex(p => 
      p.hand.some(c => c.suit === 'clubs' && c.rank === '3')
    );
    
    const partyData = {
      id: partyId,
      players: updatedPlayers,
      gameStarted: true,
      currentPlay: null,
      currentTurn: starterIndex >= 0 ? starterIndex : 0,
      roundWinner: null,
      passedPlayers: [],
      finishedPlayers: [],
      rankings: [],
      playHistory: []
    };
    
    await setPartyData(partyId, partyData);
    setGameStarted(true);
    setGameState('game');
    setFinishedPlayers([]);
    setRankings([]);
    setPlayHistory([]);
    loadPartyData();
  };

  const playCards = async () => {
    if (selectedCards.length === 0) {
      setPlayError('Please select at least one card');
      return;
    }
    
    const myPlayerIndex = players.findIndex(p => p.name === currentPlayerName);
    
    if (players[myPlayerIndex]?.finished) {
      setPlayError("You've already finished - waiting for others");
      return;
    }
    
    if (myPlayerIndex !== currentTurn) {
      setPlayError("It's not your turn");
      return;
    }
    
    setPlayError(''); // Clear any previous errors
    
    const cardsToPlay = selectedCards.map(index => myHand[index]);
    
    // Very first play of the game must include 3 of Clubs
    if (currentPlay === null && roundWinner === null) {
      const hasThreeClubs = cardsToPlay.some(c => c.suit === 'clubs' && c.rank === '3');
      if (!hasThreeClubs) {
        setPlayError('First play of the game must include 3 of Clubs');
        return;
      }
    }
    
    // If there's a current play and you're not the round winner, you must beat it
    if (currentPlay !== null && !canBeatHand(cardsToPlay, currentPlay)) {
      setPlayError('This hand cannot beat the current play');
      return;
    }
    
    // Validate that the cards form a valid hand type
    if (!getHandType(cardsToPlay)) {
      setPlayError('Invalid hand - must be single, pair, or valid 5-card combo');
      return;
    }
    
    const updatedHand = myHand.filter((_, i) => !selectedCards.includes(i));
    const updatedPlayers = [...players];
    updatedPlayers[myPlayerIndex] = { ...updatedPlayers[myPlayerIndex], hand: updatedHand };
    
    // Calculate next turn - skip finished players
    let nextTurn = (currentTurn + 1) % players.length;
    while (updatedPlayers[nextTurn].finished || passedPlayers.includes(nextTurn)) {
      nextTurn = (nextTurn + 1) % players.length;
      // Safety check to prevent infinite loop
      if (nextTurn === currentTurn) break;
    }
    
    let newFinishedPlayers = [...finishedPlayers];
    let newRankings = [...rankings];
    
    if (updatedHand.length === 0) {
      updatedPlayers[myPlayerIndex].finished = true;
      newFinishedPlayers.push(myPlayerIndex);
      newRankings.push(currentPlayerName);
      
      const activePlayers = updatedPlayers.filter(p => !p.finished);
      if (activePlayers.length === 1) {
        const lastPlayerIndex = updatedPlayers.findIndex(p => !p.finished);
        newRankings.push(updatedPlayers[lastPlayerIndex].name);
      }
    }
    
    // Check if everyone else will pass (all other active players have already passed)
    const activePlayers = updatedPlayers.filter((p, i) => !p.finished);
    const allOthersHavePassed = activePlayers.every((p, i) => {
      const actualIndex = updatedPlayers.findIndex(player => player.name === p.name);
      return actualIndex === myPlayerIndex || passedPlayers.includes(actualIndex);
    });
    
    // Check if user played 2 of Spades (highest single card)
    const played2OfSpades = cardsToPlay.length === 1 && 
                            cardsToPlay[0].rank === '2' && 
                            cardsToPlay[0].suit === 'spades';
    
    // If everyone else has already passed OR played 2 of Spades, skip to next turn with cleared round
    // BUT if user just finished, give control to the next active player
    if ((allOthersHavePassed || played2OfSpades) && activePlayers.length > 1 && updatedHand.length > 0) {
      if (isSoloMode) {
        const newHistory = [...playHistory, { cards: cardsToPlay, player: currentPlayerName, action: 'play' }].slice(-10);
        
        setPlayers(updatedPlayers);
        setMyHand(updatedHand);
        setCurrentPlay(null);
        setCurrentTurn(myPlayerIndex);
        setRoundWinner(myPlayerIndex);
        setPassedPlayers([]);
        setSelectedCards([]);
        setFinishedPlayers(newFinishedPlayers);
        setRankings(newRankings);
        setPlayHistory(newHistory);
        return;
      }
      
      const newHistory = [...playHistory, { cards: cardsToPlay, player: currentPlayerName, action: 'play' }].slice(-10);
      
      const partyData = {
        id: partyId,
        players: updatedPlayers,
        gameStarted: true,
        currentPlay: null,
        currentTurn: myPlayerIndex,
        roundWinner: myPlayerIndex,
        passedPlayers: [],
        finishedPlayers: newFinishedPlayers,
        rankings: newRankings,
        playHistory: newHistory
      };
      
      await setPartyData(partyId, partyData);
      setSelectedCards([]);
      loadPartyData();
      return;
    }
    
    // If user just finished their last card and everyone else has passed, give control to next player
    if (allOthersHavePassed && updatedHand.length === 0 && activePlayers.length > 1) {
      // Find the next active player after the user
      let nextActivePlayer = (myPlayerIndex + 1) % updatedPlayers.length;
      while (updatedPlayers[nextActivePlayer].finished) {
        nextActivePlayer = (nextActivePlayer + 1) % updatedPlayers.length;
        // Safety check
        if (nextActivePlayer === myPlayerIndex) break;
      }
      
      // Only proceed if we found a valid active player
      if (!updatedPlayers[nextActivePlayer].finished) {
        if (isSoloMode) {
          const newHistory = [...playHistory, { cards: cardsToPlay, player: currentPlayerName, action: 'play' }].slice(-10);
          
          setPlayers(updatedPlayers);
          setMyHand(updatedHand);
          setCurrentPlay(null);
          setCurrentTurn(nextActivePlayer);
          setRoundWinner(nextActivePlayer);
          setPassedPlayers([]);
          setSelectedCards([]);
          setFinishedPlayers(newFinishedPlayers);
          setRankings(newRankings);
          setPlayHistory(newHistory);
          
          if (updatedPlayers[nextActivePlayer].isAI) {
            setTimeout(() => aiPlayTurn(updatedPlayers, nextActivePlayer, null, nextActivePlayer, [], newFinishedPlayers, newRankings, newHistory), 1500);
          }
          return;
        }
        
        const newHistory = [...playHistory, { cards: cardsToPlay, player: currentPlayerName, action: 'play' }].slice(-10);
        
        const partyData = {
          id: partyId,
          players: updatedPlayers,
          gameStarted: true,
          currentPlay: null,
          currentTurn: nextActivePlayer,
          roundWinner: nextActivePlayer,
          passedPlayers: [],
          finishedPlayers: newFinishedPlayers,
          rankings: newRankings,
          playHistory: newHistory
        };
        
        await setPartyData(partyId, partyData);
        setSelectedCards([]);
        loadPartyData();
        return;
      }
    }
    
    if (isSoloMode) {
      const newHistory = [...playHistory, { cards: cardsToPlay, player: currentPlayerName, action: 'play' }].slice(-10);
      
      setPlayers(updatedPlayers);
      setMyHand(updatedHand);
      setCurrentPlay({ cards: cardsToPlay, player: currentPlayerName });
      setCurrentTurn(nextTurn);
      setRoundWinner(myPlayerIndex);
      setPassedPlayers([]);
      setSelectedCards([]);
      setFinishedPlayers(newFinishedPlayers);
      setRankings(newRankings);
      setPlayHistory(newHistory);
      
      // Continue with AI turns even if user finished
      if (updatedPlayers[nextTurn].isAI) {
        setTimeout(() => aiPlayTurn(updatedPlayers, nextTurn, { cards: cardsToPlay, player: currentPlayerName }, myPlayerIndex, [], newFinishedPlayers, newRankings, newHistory), 1500);
      }
      return;
    }
    
    const newHistory = [...playHistory, { cards: cardsToPlay, player: currentPlayerName, action: 'play' }].slice(-10);
    
    const partyData = {
      id: partyId,
      players: updatedPlayers,
      gameStarted: true,
      currentPlay: { cards: cardsToPlay, player: currentPlayerName },
      currentTurn: nextTurn,
      roundWinner: myPlayerIndex,
      passedPlayers: [],
      finishedPlayers: newFinishedPlayers,
      rankings: newRankings,
      playHistory: newHistory
    };
    
    await setPartyData(partyId, partyData);
    setSelectedCards([]);
    loadPartyData();
  };

  const pass = async () => {
    const myPlayerIndex = players.findIndex(p => p.name === currentPlayerName);
    if (myPlayerIndex !== currentTurn) return;
    if (!currentPlay) return;
    
    const newPassedPlayers = [...passedPlayers, myPlayerIndex];
    
    // Check if everyone else has passed (all other active players)
    const activePlayers = players.filter((p, i) => !p.finished);
    const allOthersHavePassed = activePlayers.every((p, i) => {
      const actualIndex = players.findIndex(player => player.name === p.name);
      return actualIndex === roundWinner || newPassedPlayers.includes(actualIndex);
    });
    
    if (allOthersHavePassed && activePlayers.length > 1) {
      // Round is over - give control to round winner, or next active player if round winner finished
      let nextPlayerToControl = roundWinner;
      
      // If round winner has finished, find the next active player
      if (players[roundWinner]?.finished) {
        nextPlayerToControl = (roundWinner + 1) % players.length;
        while (players[nextPlayerToControl].finished) {
          nextPlayerToControl = (nextPlayerToControl + 1) % players.length;
          // Safety check to prevent infinite loop
          if (nextPlayerToControl === roundWinner) break;
        }
      }
      
      // Only proceed if we found a valid active player
      if (!players[nextPlayerToControl].finished) {
        if (isSoloMode) {
          const newHistory = [...playHistory, { player: currentPlayerName, action: 'pass' }].slice(-10);
          setCurrentPlay(null);
          setCurrentTurn(nextPlayerToControl);
          setRoundWinner(nextPlayerToControl);
          setPassedPlayers([]);
          setPlayHistory(newHistory);
          if (players[nextPlayerToControl].isAI) {
            setTimeout(() => aiPlayTurn(players, nextPlayerToControl, null, nextPlayerToControl, [], finishedPlayers, rankings, newHistory), 1500);
          }
          return;
        }
        
        const newHistory = [...playHistory, { player: currentPlayerName, action: 'pass' }].slice(-10);
        
        const partyData = {
          id: partyId,
          players: players,
          gameStarted: true,
          currentPlay: null,
          currentTurn: nextPlayerToControl,
          roundWinner: nextPlayerToControl,
          passedPlayers: [],
          finishedPlayers: finishedPlayers,
          rankings: rankings,
          playHistory: newHistory
        };
        await setPartyData(partyId, partyData);
        loadPartyData();
        return;
      }
    }
    
    // Continue to next player who hasn't passed
    let nextTurn = (currentTurn + 1) % players.length;
    while (players[nextTurn].finished || newPassedPlayers.includes(nextTurn)) {
      nextTurn = (nextTurn + 1) % players.length;
    }
    
    if (isSoloMode) {
      const newHistory = [...playHistory, { player: currentPlayerName, action: 'pass' }].slice(-10);
      setCurrentPlay(currentPlay);
      setCurrentTurn(nextTurn);
      setPassedPlayers(newPassedPlayers);
      setPlayHistory(newHistory);
      
      if (players[nextTurn].isAI && !players[nextTurn].finished) {
        setTimeout(() => aiPlayTurn(players, nextTurn, currentPlay, roundWinner, newPassedPlayers, finishedPlayers, rankings, newHistory), 1500);
      }
      return;
    }
    
    const newHistory = [...playHistory, { player: currentPlayerName, action: 'pass' }].slice(-10);
    
    const partyData = {
      id: partyId,
      players: players,
      gameStarted: true,
      currentPlay: currentPlay,
      currentTurn: nextTurn,
      roundWinner: roundWinner,
      passedPlayers: newPassedPlayers,
      finishedPlayers: finishedPlayers,
      rankings: rankings,
      playHistory: newHistory
    };
    
    await setPartyData(partyId, partyData);
    loadPartyData();
  };

  const aiPlayTurn = (currentPlayers, aiIndex, play, winner, passed, finished, ranks, history = []) => {
    const aiPlayer = currentPlayers[aiIndex];
    const aiHand = aiPlayer.hand;
    
    // Skip if this AI has already finished
    if (aiPlayer.finished) {
      let nextTurn = (aiIndex + 1) % currentPlayers.length;
      while (currentPlayers[nextTurn].finished) {
        nextTurn = (nextTurn + 1) % currentPlayers.length;
        
        // Check if game is over
        const activePlayers = currentPlayers.filter(p => !p.finished);
        if (activePlayers.length === 0) return;
      }
      
      if (currentPlayers[nextTurn].isAI) {
        setTimeout(() => aiPlayTurn(currentPlayers, nextTurn, play, winner, passed, finished, ranks, history), 1500);
      }
      return;
    }
    
    // Find valid plays
    const validPlays = [];
    
    // If no current play (won the last round or start of game), can play anything
    if (!play) {
      // Try singles
      for (let i = 0; i < aiHand.length; i++) {
        validPlays.push([i]);
      }
      
      // Try pairs
      for (let i = 0; i < aiHand.length; i++) {
        for (let j = i + 1; j < aiHand.length; j++) {
          if (aiHand[i].rank === aiHand[j].rank) {
            validPlays.push([i, j]);
          }
        }
      }
      
      // Try 5-card combinations
      for (let i = 0; i < aiHand.length - 4; i++) {
        const fiveCards = [aiHand[i], aiHand[i+1], aiHand[i+2], aiHand[i+3], aiHand[i+4]];
        if (getHandType(fiveCards)) {
          validPlays.push([i, i+1, i+2, i+3, i+4]);
        }
      }
    } else {
      // Must beat current play
      // Try singles
      if (play.cards.length === 1) {
        for (let i = 0; i < aiHand.length; i++) {
          if (canBeatHand([aiHand[i]], play)) {
            validPlays.push([i]);
          }
        }
      }
      
      // Try pairs
      if (play.cards.length === 2) {
        for (let i = 0; i < aiHand.length; i++) {
          for (let j = i + 1; j < aiHand.length; j++) {
            if (aiHand[i].rank === aiHand[j].rank && canBeatHand([aiHand[i], aiHand[j]], play)) {
              validPlays.push([i, j]);
            }
          }
        }
      }
      
      // Try 5-card combinations
      if (play.cards.length === 5) {
        for (let i = 0; i < aiHand.length - 4; i++) {
          const fiveCards = [aiHand[i], aiHand[i+1], aiHand[i+2], aiHand[i+3], aiHand[i+4]];
          if (canBeatHand(fiveCards, play)) {
            validPlays.push([i, i+1, i+2, i+3, i+4]);
          }
        }
      }
    }
    
    // If no valid plays or randomly decide to pass (only if there's a current play), pass
    if (validPlays.length === 0 || (play && Math.random() < 0.3)) {
      // AI passes (only valid if there's a current play)
      if (!play) {
        // Must play something - choose lowest single card
        const lowestCardIndex = 0;
        const cardsToPlay = [aiHand[lowestCardIndex]];
        
        const updatedHand = aiHand.filter((_, idx) => idx !== lowestCardIndex);
        const updatedPlayers = [...currentPlayers];
        updatedPlayers[aiIndex] = { ...updatedPlayers[aiIndex], hand: updatedHand };
        
        let nextTurn = (aiIndex + 1) % currentPlayers.length;
        while (updatedPlayers[nextTurn].finished) {
          nextTurn = (nextTurn + 1) % currentPlayers.length;
        }
        
        let newFinished = [...finished];
        let newRankings = [...ranks];
        
        if (updatedHand.length === 0) {
          updatedPlayers[aiIndex].finished = true;
          newFinished.push(aiIndex);
          newRankings.push(aiPlayer.name);
          
          const activePlayers = updatedPlayers.filter(p => !p.finished);
          if (activePlayers.length === 1) {
            const lastPlayerIndex = updatedPlayers.findIndex(p => !p.finished);
            newRankings.push(updatedPlayers[lastPlayerIndex].name);
          }
        }
        
        const newHistory = [...history, { cards: cardsToPlay, player: aiPlayer.name, action: 'play' }].slice(-10);
        
        setPlayers(updatedPlayers);
        setCurrentPlay({ cards: cardsToPlay, player: aiPlayer.name });
        setCurrentTurn(nextTurn);
        setRoundWinner(aiIndex);
        setPassedPlayers([]);
        setFinishedPlayers(newFinished);
        setRankings(newRankings);
        setPlayHistory(newHistory);
        
        if (!updatedPlayers[0].isAI) {
          setMyHand(updatedPlayers[0].hand);
        }
        
        if (updatedPlayers[nextTurn].isAI && !updatedPlayers[nextTurn].finished) {
          setTimeout(() => aiPlayTurn(updatedPlayers, nextTurn, { cards: cardsToPlay, player: aiPlayer.name }, aiIndex, [], newFinished, newRankings, newHistory), 1500);
        }
        return;
      }
      
      const newPassedPlayers = [...passed, aiIndex];
      let nextTurn = (aiIndex + 1) % currentPlayers.length;
      
      // Check if all other active players have passed
      const activePlayers = currentPlayers.filter(p => !p.finished);
      const allOthersHavePassed = activePlayers.every((p, i) => {
        const actualIndex = currentPlayers.findIndex(player => player.name === p.name);
        return actualIndex === winner || newPassedPlayers.includes(actualIndex);
      });
      
      if (allOthersHavePassed && activePlayers.length > 1) {
        // Round is over - give control to round winner, or next active player if round winner finished
        let nextPlayerToControl = winner;
        
        // If round winner has finished, find the next active player
        if (currentPlayers[winner]?.finished) {
          nextPlayerToControl = (winner + 1) % currentPlayers.length;
          while (currentPlayers[nextPlayerToControl].finished) {
            nextPlayerToControl = (nextPlayerToControl + 1) % currentPlayers.length;
            // Safety check to prevent infinite loop
            if (nextPlayerToControl === winner) break;
          }
        }
        
        // Only proceed if we found a valid active player
        if (!currentPlayers[nextPlayerToControl].finished) {
          const newHistory = [...history, { player: aiPlayer.name, action: 'pass' }].slice(-10);
          setCurrentPlay(null);
          setCurrentTurn(nextPlayerToControl);
          setRoundWinner(nextPlayerToControl);
          setPassedPlayers([]);
          setPlayHistory(newHistory);
          
          if (currentPlayers[nextPlayerToControl].isAI) {
            setTimeout(() => aiPlayTurn(currentPlayers, nextPlayerToControl, null, nextPlayerToControl, [], finished, ranks, newHistory), 1500);
          }
          return;
        }
      }
      
      // Find next active player
      while (currentPlayers[nextTurn].finished || newPassedPlayers.includes(nextTurn)) {
        nextTurn = (nextTurn + 1) % currentPlayers.length;
      }
      
      const newHistory = [...history, { player: aiPlayer.name, action: 'pass' }].slice(-10);
      setPassedPlayers(newPassedPlayers);
      setCurrentTurn(nextTurn);
      setPlayHistory(newHistory);
      
      if (currentPlayers[nextTurn].isAI && !currentPlayers[nextTurn].finished) {
        setTimeout(() => aiPlayTurn(currentPlayers, nextTurn, play, winner, newPassedPlayers, finished, ranks, newHistory), 1500);
      }
      return;
    }
    
    // Play a random valid move (prefer smaller plays to save good cards)
    const chosenPlay = validPlays[Math.floor(Math.random() * Math.min(validPlays.length, 3))];
    const cardsToPlay = chosenPlay.map(idx => aiHand[idx]);
    
    // Update hand
    const updatedHand = aiHand.filter((_, idx) => !chosenPlay.includes(idx));
    const updatedPlayers = [...currentPlayers];
    updatedPlayers[aiIndex] = { ...updatedPlayers[aiIndex], hand: updatedHand };
    
    let nextTurn = (aiIndex + 1) % currentPlayers.length;
    while (updatedPlayers[nextTurn].finished || passed.includes(nextTurn)) {
      nextTurn = (nextTurn + 1) % currentPlayers.length;
    }
    
    let newFinished = [...finished];
    let newRankings = [...ranks];
    
    if (updatedHand.length === 0) {
      updatedPlayers[aiIndex].finished = true;
      newFinished.push(aiIndex);
      newRankings.push(aiPlayer.name);
      
      const activePlayers = updatedPlayers.filter(p => !p.finished);
      if (activePlayers.length === 1) {
        const lastPlayerIndex = updatedPlayers.findIndex(p => !p.finished);
        newRankings.push(updatedPlayers[lastPlayerIndex].name);
      }
    }
    
    const newHistory = [...history, { cards: cardsToPlay, player: aiPlayer.name, action: 'play' }].slice(-10);
    
    // Check if AI played 2 of Spades (auto-win)
    const played2OfSpades = cardsToPlay.length === 1 && 
                            cardsToPlay[0].rank === '2' && 
                            cardsToPlay[0].suit === 'spades';
    
    setPlayers(updatedPlayers);
    setCurrentPlay({ cards: cardsToPlay, player: aiPlayer.name });
    setCurrentTurn(played2OfSpades && updatedHand.length > 0 ? aiIndex : nextTurn);
    setRoundWinner(aiIndex);
    setPassedPlayers([]);
    setFinishedPlayers(newFinished);
    setRankings(newRankings);
    setPlayHistory(newHistory);
    
    // Update player 0's hand if they're the human
    if (!updatedPlayers[0].isAI) {
      setMyHand(updatedPlayers[0].hand);
    }
    
    // If played 2 of Spades and AI still has cards, clear the round and give AI another turn
    if (played2OfSpades && updatedHand.length > 0) {
      setTimeout(() => {
        setCurrentPlay(null);
        if (updatedPlayers[aiIndex].isAI && !updatedPlayers[aiIndex].finished) {
          setTimeout(() => aiPlayTurn(updatedPlayers, aiIndex, null, aiIndex, [], newFinished, newRankings, newHistory), 1000);
        }
      }, 1500);
      return;
    }
    
    // If AI just finished (no cards left), check if everyone will pass and give control to next active player
    if (updatedHand.length === 0) {
      const activePlayers = updatedPlayers.filter(p => !p.finished);
      // If there are still other players and they will all pass, give control to next player
      if (activePlayers.length > 1) {
        setTimeout(() => {
          // Find next active player
          let nextActivePlayer = (aiIndex + 1) % updatedPlayers.length;
          while (updatedPlayers[nextActivePlayer].finished) {
            nextActivePlayer = (nextActivePlayer + 1) % updatedPlayers.length;
          }
          
          setCurrentPlay(null);
          setCurrentTurn(nextActivePlayer);
          setRoundWinner(nextActivePlayer);
          setPassedPlayers([]);
          
          if (updatedPlayers[nextActivePlayer].isAI) {
            setTimeout(() => aiPlayTurn(updatedPlayers, nextActivePlayer, null, nextActivePlayer, [], newFinished, newRankings, newHistory), 1000);
          }
        }, 1500);
        return;
      }
    }
    
    // Continue AI turns if next player is AI
    if (updatedPlayers[nextTurn].isAI) {
      setTimeout(() => aiPlayTurn(updatedPlayers, nextTurn, { cards: cardsToPlay, player: aiPlayer.name }, aiIndex, [], newFinished, newRankings, newHistory), 1500);
    }
  };

  const leaveParty = async () => {
    if (isSoloMode) {
      setGameState('menu');
      setPartyId('');
      setPlayerName('');
      setCurrentPlayerName('');
      setPlayers([]);
      setMyHand([]);
      setShowLeaveModal(false);
      setIsSoloMode(false);
      setCurrentPlay(null);
      setCurrentTurn(0);
      setRoundWinner(null);
      setPassedPlayers([]);
      setFinishedPlayers([]);
      setRankings([]);
      setGameStarted(false);
      setPlayHistory([]);
      setPlayError('');
      return;
    }
    
    try {
      const partyData = await getPartyData(partyId);
      
      if (partyData) {
        partyData.players = partyData.players.filter(p => p.name !== currentPlayerName);
        
        if (partyData.players.length === 0) {
          await deleteParty(partyId);
        } else {
          await setPartyData(partyId, partyData);
        }
      }
      
      setGameState('menu');
      setPartyId('');
      setPlayerName('');
      setCurrentPlayerName('');
      setPlayers([]);
      setMyHand([]);
      setShowLeaveModal(false);
      setCurrentPlay(null);
      setCurrentTurn(0);
      setRoundWinner(null);
      setPassedPlayers([]);
      setFinishedPlayers([]);
      setRankings([]);
      setGameStarted(false);
      setPlayHistory([]);
      setPlayError('');
    } catch (error) {
      console.error('Error leaving party:', error);
      // Even if there's an error, reset to menu
      setGameState('menu');
      setPartyId('');
      setPlayerName('');
      setCurrentPlayerName('');
      setPlayers([]);
      setMyHand([]);
      setShowLeaveModal(false);
    }
  };

  const copyPartyLink = () => {
    navigator.clipboard.writeText(`Party ID: ${partyId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleCardSelection = (index) => {
    setPlayError(''); // Clear error when selecting cards
    setSelectedCards(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const Card = ({ card, selected, onClick }) => {
    const SuitIcon = SUIT_ICONS[card.suit];
    const suitColor = getSuitColor(card.suit);
    
    return (
      <div
        onClick={onClick}
        className={`relative bg-white rounded-xl cursor-pointer transition-all duration-200 ${
          selected 
            ? 'border-2 border-gray-900 -translate-y-2 sm:-translate-y-4 shadow-lg' 
            : 'border border-gray-200 hover:-translate-y-1 sm:hover:-translate-y-2 shadow-sm hover:shadow-md'
        } w-14 h-20 sm:w-20 sm:h-28`}
      >
        <div className="absolute top-1 left-1 sm:top-1.5 sm:left-2 flex flex-col items-center">
          <span className="font-semibold text-sm sm:text-lg leading-none" style={{ color: suitColor }}>
            {card.rank}
          </span>
          <SuitIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: suitColor }} fill={suitColor} strokeWidth={0} />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <SuitIcon className="w-5 h-5 sm:w-8 sm:h-8" style={{ color: suitColor }} fill={suitColor} strokeWidth={0} />
        </div>
        <div className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-2 flex flex-col items-center rotate-180">
          <span className="font-semibold text-sm sm:text-lg leading-none" style={{ color: suitColor }}>
            {card.rank}
          </span>
          <SuitIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: suitColor }} fill={suitColor} strokeWidth={0} />
        </div>
      </div>
    );
  };

  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Spade className="text-gray-900" size={28} fill="currentColor" strokeWidth={0} />
              <h1 className="text-5xl font-semibold text-gray-900 tracking-tight" 
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif' }}>
                Big Two
              </h1>
              <Heart className="text-red-500" size={28} fill="currentColor" strokeWidth={0} />
            </div>
            <p className="text-gray-500 text-lg font-normal">
              Play the classic card game
            </p>
          </div>

          <div className="space-y-3 mb-8">
            <input
              type="text"
              placeholder="Enter Your Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 text-base font-normal transition-all mb-4"
            />
            
            <button
              onClick={startSoloGame}
              className="w-full bg-gray-900 text-white font-medium py-4 px-6 rounded-2xl hover:bg-gray-800 transition-all duration-200 text-base shadow-sm"
            >
              Practice with AI
            </button>
            
            <button
              onClick={createParty}
              disabled={!playerName.trim()}
              className="w-full bg-white text-gray-900 font-medium py-4 px-6 rounded-2xl border-2 border-gray-900 hover:bg-gray-50 transition-all duration-200 text-base disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed"
            >
              Create Multiplayer Game
            </button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400 font-normal">or join with game ID</span>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Enter Game ID"
              value={partyId}
              onChange={(e) => setPartyId(e.target.value.toUpperCase())}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 text-base font-normal transition-all"
            />

            <button
              onClick={joinParty}
              disabled={!partyId || !playerName.trim()}
              className="w-full bg-gray-900 text-white font-medium py-3.5 px-6 rounded-xl hover:bg-gray-800 transition-all duration-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-base"
            >
              Join Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'lobby') {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2 tracking-tight" 
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif' }}>
                Game Lobby
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-normal">Game ID:</span>
                <code className="bg-gray-900 text-white px-3 py-1 rounded-lg font-mono text-sm font-medium">
                  {partyId}
                </code>
                <button
                  onClick={copyPartyLink}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {copied ? (
                    <Check className="text-gray-900" size={18} />
                  ) : (
                    <Copy className="text-gray-500" size={18} />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all font-medium text-sm"
            >
              <LogOut size={16} />
              Leave
            </button>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-gray-200 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Users className="text-gray-900" size={22} />
              <h2 className="text-xl font-semibold text-gray-900">
                Players ({players.length}/4)
              </h2>
            </div>
            
            <div className="space-y-3">
              {players.map((player, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-50 rounded-2xl px-6 py-4 border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-semibold text-sm">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-gray-900 font-medium text-base">{player.name}</span>
                    {player.name === currentPlayerName && (
                      <span className="text-gray-500 text-sm font-normal">(You)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {players.length < 3 && (
              <p className="text-gray-500 text-center mt-6 text-sm font-normal">
                Waiting for {3 - players.length} more player{3 - players.length !== 1 ? 's' : ''}...
              </p>
            )}
          </div>

          {players.length >= 3 && players.length <= 4 && (
            <>
              {gameStarted && rankings.length === players.length ? (
                <button
                  onClick={startNewGame}
                  className="w-full bg-gray-900 text-white font-medium py-4 px-6 rounded-2xl hover:bg-gray-800 transition-all duration-200 text-base shadow-sm"
                >
                  Start New Game
                </button>
              ) : !gameStarted ? (
                <button
                  onClick={startGame}
                  className="w-full bg-gray-900 text-white font-medium py-4 px-6 rounded-2xl hover:bg-gray-800 transition-all duration-200 text-base shadow-sm"
                >
                  Start Game
                </button>
              ) : null}
            </>
          )}
        </div>

        {showLeaveModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Leave Game?</h3>
              <p className="text-gray-600 mb-6 font-normal leading-relaxed">
                Are you sure you want to leave this game? You won't be able to rejoin with the same name.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="flex-1 bg-gray-100 text-gray-900 py-3 px-4 rounded-xl hover:bg-gray-200 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={leaveParty}
                  className="flex-1 bg-gray-900 text-white py-3 px-4 rounded-xl hover:bg-gray-800 transition-all font-medium"
                >
                  Leave
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (gameState === 'game' || gameState === 'finished') {
    const myPlayerIndex = players.findIndex(p => p.name === currentPlayerName);
    const isMyTurn = currentTurn === myPlayerIndex && !players[myPlayerIndex]?.finished;
    const hasFinished = players[myPlayerIndex]?.finished;
    const gameOver = rankings.length === players.length;

    return (
      <div className="min-h-screen bg-gray-50 p-3 sm:p-4 flex flex-col">
        <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight" 
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif' }}>
                Big Two
              </h1>
              <code className="bg-gray-900 text-white px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-mono text-xs font-medium">
                {partyId}
              </code>
            </div>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="flex items-center gap-1.5 sm:gap-2 bg-white text-gray-700 border border-gray-300 px-2.5 sm:px-3 py-1.5 sm:py-1.5 rounded-xl hover:bg-gray-50 transition-all font-medium text-xs sm:text-sm"
            >
              <LogOut size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Leave</span>
            </button>
          </div>

          {gameOver && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 mb-3 sm:mb-4 shadow-sm">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <Trophy className="text-gray-900" size={20} />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Game Over</h2>
              </div>
              <div className="space-y-2">
                {rankings.map((name, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-100">
                    <div className="flex items-center gap-2">
                      {index === 0 && <Crown className="text-gray-900" size={16} fill="#111827" strokeWidth={0} />}
                      {index === rankings.length - 1 && <span className="text-base sm:text-lg">💩</span>}
                      <span className="text-gray-900 font-medium text-xs sm:text-sm">
                        {index + 1}. {name}
                      </span>
                    </div>
                    <span className="text-gray-500 text-xs font-normal">
                      {index === 0 ? 'Winner' : index === rankings.length - 1 ? 'Last place' : `#${index + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compact Player Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 sm:mb-4">
            {players.map((player, index) => {
              const playerPlace = rankings.indexOf(player.name) + 1;
              const placeEmoji = playerPlace === 1 ? '🥇' : playerPlace === 2 ? '🥈' : playerPlace === 3 ? '🥉' : playerPlace === 4 ? '💩' : '';
              
              // Different colors for each player
              const avatarColors = [
                'bg-blue-600',    // Player 1
                'bg-purple-600',  // Player 2
                'bg-emerald-600', // Player 3
                'bg-orange-600'   // Player 4
              ];
              
              return (
                <div
                  key={index}
                  className={`bg-white rounded-xl p-2 sm:p-2.5 transition-all relative ${
                    currentTurn === index && !player.finished
                      ? 'border-2 border-gray-900'
                      : 'border border-gray-200'
                  }`}
                >
                  {player.finished && placeEmoji && (
                    <div className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 text-base sm:text-lg">
                      {placeEmoji}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full ${avatarColors[index]} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-900 font-medium text-xs truncate">
                        {player.name}
                        {player.name === currentPlayerName && <span className="text-gray-400 ml-1">(You)</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-gray-500 text-xs font-normal">
                    {player.finished ? (
                      <span className="text-gray-900 font-medium">
                        {playerPlace === 1 ? '1st' : playerPlace === 2 ? '2nd' : playerPlace === 3 ? '3rd' : '4th'}
                      </span>
                    ) : (
                      <span>{player.hand?.length || 0} cards</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current Play & Recent Plays - Side by side on all screen sizes */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3 mb-3 sm:mb-4">
            {/* Current Play - 3 columns on mobile, 3 on desktop */}
            <div className="col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-6 flex flex-col items-center justify-center overflow-hidden min-h-[140px] sm:min-h-[200px]">
              <h3 className="text-gray-400 text-[10px] sm:text-xs mb-2 sm:mb-5 uppercase tracking-wider font-medium">Current Play</h3>
              {currentPlay ? (
                <div className="w-full flex flex-col items-center">
                  <p className="text-gray-900 text-center mb-2 sm:mb-5 font-medium text-[10px] sm:text-sm">
                    {currentPlay.player}
                  </p>
                  <div className="flex gap-1 sm:gap-2.5 justify-center flex-wrap">
                    {currentPlay.cards.map((card, index) => (
                      <Card key={index} card={card} selected={false} />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-[10px] sm:text-sm font-normal">No cards played</p>
              )}
            </div>

            {/* Recent Plays - 2 columns on mobile, 2 on desktop */}
            <div className="col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-2 sm:p-4 flex flex-col overflow-hidden min-h-[140px] sm:min-h-[200px]">
              <h3 className="text-gray-500 text-[10px] sm:text-xs mb-2 sm:mb-3 uppercase tracking-wider font-medium flex-shrink-0">Recent</h3>
              <div className="space-y-1.5 sm:space-y-2.5 overflow-y-auto flex-1">
                {playHistory.length > 0 ? (
                  playHistory.slice().reverse().map((play, index) => {
                    const isLatest = index === 0;
                    return (
                      <div 
                        key={index} 
                        className={`text-xs ${isLatest ? 'bg-gray-50 -mx-0.5 sm:-mx-1 px-0.5 sm:px-1 py-0.5 sm:py-1 rounded-lg' : ''}`}
                      >
                        <div className="flex items-start gap-1 sm:gap-2">
                          <span className={`font-medium ${isLatest ? 'text-gray-900' : 'text-gray-500'} min-w-[35px] sm:min-w-[60px] flex-shrink-0 text-[9px] sm:text-xs truncate`}>
                            {play.player}
                          </span>
                          {play.action === 'pass' ? (
                            <span className={`italic ${isLatest ? 'text-gray-600' : 'text-gray-400'} text-[9px] sm:text-xs`}>pass</span>
                          ) : (
                            <div className="flex gap-0.5 sm:gap-1 flex-wrap">
                              {play.cards.map((card, cardIndex) => {
                                const SuitIcon = SUIT_ICONS[card.suit];
                                const suitColor = getSuitColor(card.suit);
                                return (
                                  <span 
                                    key={cardIndex} 
                                    className="font-medium whitespace-nowrap text-[9px] sm:text-xs" 
                                    style={{ color: isLatest ? suitColor : `${suitColor}99` }}
                                  >
                                    {card.rank}
                                    <SuitIcon 
                                      className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 inline ml-0.5"
                                      style={{ color: isLatest ? suitColor : `${suitColor}99` }} 
                                      fill={isLatest ? suitColor : `${suitColor}99`} 
                                      strokeWidth={0} 
                                    />
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        {isLatest && (
                          <div className="text-[8px] sm:text-[10px] text-gray-400 mt-0.5">← Latest</div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-400 text-[9px] sm:text-xs font-normal text-center mt-4 sm:mt-8">No plays yet</p>
                )}
              </div>
            </div>
          </div>

          {!hasFinished && (
            <>
              {/* Your Hand */}
              <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-200 mb-3 shadow-sm">
                <h3 className="text-gray-900 text-xs sm:text-sm font-semibold mb-2 sm:mb-3">Your Hand</h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
                  {myHand.map((card, index) => (
                    <Card
                      key={index}
                      card={card}
                      selected={selectedCards.includes(index)}
                      onClick={() => toggleCardSelection(index)}
                    />
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center items-stretch sm:items-center">
                <button
                  onClick={playCards}
                  disabled={!isMyTurn || selectedCards.length === 0}
                  className="bg-gray-900 text-white font-medium py-3 px-6 sm:px-8 rounded-xl hover:bg-gray-800 transition-all duration-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-sm shadow-sm"
                >
                  Play Cards
                </button>
                {currentPlay && (
                  <button
                    onClick={pass}
                    disabled={!isMyTurn}
                    className="bg-white text-gray-900 border border-gray-300 font-medium py-3 px-6 sm:px-8 rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-sm"
                  >
                    Pass
                  </button>
                )}
              </div>

              {/* Status Messages & Errors */}
              <div className="text-center mt-3">
                {playError ? (
                  <p className="text-red-600 font-medium text-xs bg-red-50 px-3 py-1.5 rounded-lg inline-block">
                    {playError}
                  </p>
                ) : isMyTurn && !currentPlay ? (
                  <p className="text-gray-600 font-medium text-xs">
                    You won the last round! Play any hand.
                  </p>
                ) : isMyTurn && currentPlay ? (
                  <p className="text-gray-900 font-medium text-xs">
                    Your turn
                  </p>
                ) : null}
              </div>
            </>
          )}

          {hasFinished && !gameOver && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {(() => {
                  const myPlace = rankings.indexOf(currentPlayerName) + 1;
                  const placeEmoji = myPlace === 1 ? '🥇' : myPlace === 2 ? '🥈' : myPlace === 3 ? '🥉' : '💩';
                  const placeSuffix = myPlace === 1 ? 'st' : myPlace === 2 ? 'nd' : myPlace === 3 ? 'rd' : 'th';
                  return `Finished - ${myPlace}${placeSuffix} Place ${placeEmoji}`;
                })()}
              </h3>
              <p className="text-gray-600 font-normal text-sm">Waiting for other players...</p>
            </div>
          )}
        </div>

        {showLeaveModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3">Leave Game?</h3>
              <p className="text-gray-600 mb-6 font-normal leading-relaxed text-sm sm:text-base">
                Are you sure you want to leave this game? Your progress will be lost.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="flex-1 bg-gray-100 text-gray-900 py-3 px-4 rounded-xl hover:bg-gray-200 transition-all font-medium text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={leaveParty}
                  className="flex-1 bg-gray-900 text-white py-3 px-4 rounded-xl hover:bg-gray-800 transition-all font-medium text-sm sm:text-base"
                >
                  Leave
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default BigTwo;

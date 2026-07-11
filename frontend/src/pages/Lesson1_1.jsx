import React, { useState, useEffect } from 'react';
import AutoTranslate from '../components/AutoTranslate';
import { AnswerField, SelfGradingButtons } from '../utils/lessonHelpers';

export default function Lesson1_1({ translateAll, translationLanguage, annotations, onSaveAnswer, onSaveQuizResult }) {
  useEffect(() => {
    const handleToggle = (e) => {
      if (e.target.classList.contains('local-en-toggle')) {
        const wrap = e.target.closest('.en-wrap, .example, .bubble');
        if (wrap) {
          wrap.classList.toggle('show-en');
        } else {
          const parent = e.target.parentElement;
          if (parent) parent.classList.toggle('show-en');
        }
      } else if (e.target.classList.contains('conj-answer')) {
        e.target.classList.toggle('revealed');
      } else if (e.target.classList.contains('sample-toggle')) {
        const wrap = e.target.closest('.sample-wrap');
        if (wrap) {
          wrap.classList.toggle('show');
          const on = wrap.classList.contains('show');
          e.target.textContent = on ? '回答例を隠す' : '回答例を見る';
        }
      } else if (e.target.classList.contains('quiz-toggle')) {
        const parent = e.target.parentElement;
        if (parent) {
          parent.classList.toggle('show');
          const on = parent.classList.contains('show');
          e.target.innerHTML = on ? 'こたえを隠す' : 'こたえを見る';
        }
      }
    };
    document.addEventListener('click', handleToggle);
    return () => document.removeEventListener('click', handleToggle);
  }, []);

  return (
    <>
  <header className="hero">
    <div className="hero-inner">
      <span className="eyebrow">Chapter 1-1 ・ 初級 Beginner</span>
      <h1 className="title">〇〇は▼▼です</h1>
      <p className="subtitle">X is Y ／ 肯定文（こうていぶん）</p>
    </div>
  </header>

  <section className="section">
    <h2 className="section-title"><span className="num">1</span>意味</h2>
    <div className="meaning">
      <p>「〇〇は▼▼です」は、人や物について「<strong>〇〇は〇〇です</strong>」と<strong>説明する</strong>言い方です。<br />英語の "A is B" に当たる基本の文型です。<br />「は」は話題を表し、「です」は丁寧な言い方です。</p>
      <div className="en-wrap">
        <button className="local-en-toggle" type="button">訳を見る</button>
        <AutoTranslate text={`「〇〇は▼▼です」is the basic sentence pattern meaning "X is Y".<br /><br />「は」 (wa) marks the topic of the sentence.<br />「です」 (desu) is a polite word meaning "is/am/are".<br /><br />Use this pattern to introduce yourself or describe people and things!`} targetLang={translationLanguage} className="en" />
      </div>
    </div>
  </section>

  <section className="section">
    <h2 className="section-title"><span className="num">2</span>文型 Sentence Pattern</h2>
    <div className="pattern-box">
      <p className="pattern">〇〇 <span className="part">は</span> ▼▼ <span className="part">です</span>。</p>
      <div className="en-wrap">
        <button className="local-en-toggle" type="button">訳を見る</button>
        <AutoTranslate text={`〇〇 = Topic (subject) ／ ▼▼ = Predicate (noun/adjective)<br />"〇〇 is ▼▼."`} targetLang={translationLanguage} className="en" />
      </div>
    </div>
    <div className="examples">
      <div className="example">
        <div className="jp">わたし <span className="particle">は</span> たなか です。</div>
        <div className="reading">私は田中です。</div>
        <div className="en-wrap">
          <button className="local-en-toggle" type="button">訳を見る</button>
          <AutoTranslate text={`I am Tanaka.`} targetLang={translationLanguage} className="en" />
        </div>
      </div>
      <div className="example">
        <div className="jp">これ <span className="particle">は</span> ほん です。</div>
        <div className="reading">これは本です。</div>
        <div className="en-wrap">
          <button className="local-en-toggle" type="button">訳を見る</button>
          <AutoTranslate text={`This is a book.`} targetLang={translationLanguage} className="en" />
        </div>
      </div>
      <div className="example">
        <div className="jp">かれ <span className="particle">は</span> せんせい です。</div>
        <div className="reading">彼は先生です。</div>
        <div className="en-wrap">
          <button className="local-en-toggle" type="button">訳を見る</button>
          <AutoTranslate text={`He is a teacher.`} targetLang={translationLanguage} className="en" />
        </div>
      </div>
      <div className="example">
        <div className="jp">あれ <span className="particle">は</span> がっこう です。</div>
        <div className="reading">あれは学校です。</div>
        <div className="en-wrap">
          <button className="local-en-toggle" type="button">訳を見る</button>
          <AutoTranslate text={`That (over there) is a school.`} targetLang={translationLanguage} className="en" />
        </div>
      </div>
    </div>
  </section>

  <section className="section">
    <h2 className="section-title"><span className="num">3</span>会話練習 Conversation Practice</h2>
    <p className="section-intro">会話を読んで練習しましょう。<br />Read and practice the conversation.</p>
    <div className="dialogue">
      <div className="bubble a">
        <div className="jp">はじめまして。わたしはケンです。どうぞよろしく。</div>
        <div className="en-wrap">
          <button className="local-en-toggle" type="button">訳を見る</button>
          <AutoTranslate text={`Nice to meet you. I'm Ken. Pleased to meet you.`} targetLang={translationLanguage} className="en" />
        </div>
      </div>
      <div className="bubble b">
        <div className="jp">はじめまして。わたしはアナです。こちらこそ よろしく。</div>
        <div className="en-wrap">
          <button className="local-en-toggle" type="button">訳を見る</button>
          <AutoTranslate text={`Nice to meet you too. I'm Ana. Likewise, pleased to meet you.`} targetLang={translationLanguage} className="en" />
        </div>
      </div>
      <div className="bubble a">
        <div className="jp">アナさんは がくせい ですか？</div>
        <div className="en-wrap">
          <button className="local-en-toggle" type="button">訳を見る</button>
          <AutoTranslate text={`Are you a student, Ana?`} targetLang={translationLanguage} className="en" />
        </div>
      </div>
      <div className="bubble b">
        <div className="jp">はい、がくせいです。ケンさんは？</div>
        <div className="en-wrap">
          <button className="local-en-toggle" type="button">訳を見る</button>
          <AutoTranslate text={`Yes, I'm a student. How about you, Ken?`} targetLang={translationLanguage} className="en" />
        </div>
      </div>
      <div className="bubble a">
        <div className="jp">わたしは かいしゃいん です。</div>
        <div className="en-wrap">
          <button className="local-en-toggle" type="button">訳を見る</button>
          <AutoTranslate text={`I'm a company employee (office worker).`} targetLang={translationLanguage} className="en" />
        </div>
      </div>
    </div>
  </section>

  <section className="section">
    <h2 className="section-title"><span className="num">4</span>ポイント Key Points</h2>
    <div className="points">
      <div className="point-item">
        <div className="point-num">①</div>
        <div className="point-body">
          <div className="point-title">「は」の発音 ／ Pronunciation of 「は」</div>
          <p>助詞（じょし）の「は」は「<strong>わ (wa)</strong>」と読みます。ひらがなは「は」ですが、発音は「wa」です。</p>
          <div className="en-wrap">
            <button className="local-en-toggle" type="button">訳を見る</button>
            <AutoTranslate text={`When 「は」 is used as a particle (topic marker), it is pronounced "wa," not "ha."`} targetLang={translationLanguage} className="en" />
          </div>
        </div>
      </div>
      <div className="point-item">
        <div className="point-num">②</div>
        <div className="point-body">
          <div className="point-title">「です」の役割 ／ Role of 「です」</div>
          <p>「です」は丁寧さ（ていねいさ）を表す言葉です。英語の "is / am / are" に当たります。</p>
          <div className="en-wrap">
            <button className="local-en-toggle" type="button">訳を見る</button>
            <AutoTranslate text={`「です」 is a polite copula that corresponds to "is/am/are" in English. It makes your speech sound formal and respectful.`} targetLang={translationLanguage} className="en" />
          </div>
        </div>
      </div>
      <div className="point-item">
        <div className="point-num">③</div>
        <div className="point-body">
          <div className="point-title">名前の後ろの「さん」 ／ 「さん」 After Names</div>
          <p>日本語では、相手の名前の後ろに「<strong>さん</strong>」をつけます（例：たなかさん）。自分の名前には使いません。</p>
          <div className="en-wrap">
            <button className="local-en-toggle" type="button">訳を見る</button>
            <AutoTranslate text={`「さん」 (san) is a polite title added after someone else's name (like Mr./Ms.). Never use it with your own name.`} targetLang={translationLanguage} className="en" />
          </div>
        </div>
      </div>
    </div>
  </section>

  <section className="section">
    <h2 className="section-title"><span className="num">5</span>単語 Vocabulary</h2>
    <div className="vocab-table-wrap">
      <table className="vocab-table">
        <thead>
          <tr><th>日本語</th><th>読み方</th><th>英語</th></tr>
        </thead>
        <tbody>
          <tr><td>わたし</td><td>私（わたし）</td><td>I / me</td></tr>
          <tr><td>あなた</td><td>貴方（あなた）</td><td>you</td></tr>
          <tr><td>かれ</td><td>彼（かれ）</td><td>he / him</td></tr>
          <tr><td>かのじょ</td><td>彼女（かのじょ）</td><td>she / her</td></tr>
          <tr><td>がくせい</td><td>学生（がくせい）</td><td>student</td></tr>
          <tr><td>せんせい</td><td>先生（せんせい）</td><td>teacher</td></tr>
          <tr><td>かいしゃいん</td><td>会社員（かいしゃいん）</td><td>company employee</td></tr>
          <tr><td>いしゃ</td><td>医者（いしゃ）</td><td>doctor</td></tr>
          <tr><td>これ</td><td>—</td><td>this (near speaker)</td></tr>
          <tr><td>それ</td><td>—</td><td>that (near listener)</td></tr>
          <tr><td>あれ</td><td>—</td><td>that (far from both)</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <section className="section">
    <h2 className="section-title"><span className="num">6</span>練習問題 Exercises</h2>
    <p className="section-intro">（ ）に入る言葉を選んでみましょう。<br />Choose the correct word for each blank.</p>
    <div className="drills">
      <div className="quiz">
        <div className="quiz-q">わたし（ ）がくせいです。</div>
        <div className="quiz-a">
          <button className="quiz-toggle" type="button">こたえを見る</button>
          <p className="quiz-answer">は</p>
          <p className="quiz-note">I am a student.</p>
        
          <SelfGradingButtons blockId="lesson11_quiz_0" onGraded={onSaveQuizResult} initialValue={annotations?.["lesson11_quiz_0"]?.find(ann => ann.action === "quiz_result")?.content || null} />
        </div>
      </div>
      <div className="quiz">
        <div className="quiz-q">これ（ ）ほんです。</div>
        <div className="quiz-a">
          <button className="quiz-toggle" type="button">こたえを見る</button>
          <p className="quiz-answer">は</p>
          <p className="quiz-note">This is a book.</p>
        
          <SelfGradingButtons blockId="lesson11_quiz_1" onGraded={onSaveQuizResult} initialValue={annotations?.["lesson11_quiz_1"]?.find(ann => ann.action === "quiz_result")?.content || null} />
        </div>
      </div>
      <div className="quiz">
        <div className="quiz-q">かれ（ ）せんせい（ ）。</div>
        <div className="quiz-a">
          <button className="quiz-toggle" type="button">こたえを見る</button>
          <p className="quiz-answer">は / です</p>
          <p className="quiz-note">He is a teacher.</p>
        
          <SelfGradingButtons blockId="lesson11_quiz_2" onGraded={onSaveQuizResult} initialValue={annotations?.["lesson11_quiz_2"]?.find(ann => ann.action === "quiz_result")?.content || null} />
        </div>
      </div>
    </div>
  </section>

  <section className="section">
    <h2 className="section-title"><span className="num">7</span>日本語から英語へ JP → EN</h2>
    <p className="section-intro">次の文を英語にしてみましょう。<br />Translate the following sentences into English.</p>
    <div className="drills">
      <div className="quiz">
        <div className="quiz-q">わたしはいしゃです。</div>
        <div className="quiz-a">
          <button className="quiz-toggle" type="button">こたえを見る</button>
          <p className="quiz-answer">I am a doctor.</p>
        
          <SelfGradingButtons blockId="lesson11_quiz_3" onGraded={onSaveQuizResult} initialValue={annotations?.["lesson11_quiz_3"]?.find(ann => ann.action === "quiz_result")?.content || null} />
        </div>
      </div>
      <div className="quiz">
        <div className="quiz-q">あれはがっこうです。</div>
        <div className="quiz-a">
          <button className="quiz-toggle" type="button">こたえを見る</button>
          <p className="quiz-answer">That (over there) is a school.</p>
        
          <SelfGradingButtons blockId="lesson11_quiz_4" onGraded={onSaveQuizResult} initialValue={annotations?.["lesson11_quiz_4"]?.find(ann => ann.action === "quiz_result")?.content || null} />
        </div>
      </div>
      <div className="quiz">
        <div className="quiz-q">かのじょはかいしゃいんです。</div>
        <div className="quiz-a">
          <button className="quiz-toggle" type="button">こたえを見る</button>
          <p className="quiz-answer">She is a company employee.</p>
        
          <SelfGradingButtons blockId="lesson11_quiz_5" onGraded={onSaveQuizResult} initialValue={annotations?.["lesson11_quiz_5"]?.find(ann => ann.action === "quiz_result")?.content || null} />
        </div>
      </div>
    </div>
  </section>

  <section className="section">
    <h2 className="section-title"><span className="num">8</span>英語から日本語へ EN → JP</h2>
    <p className="section-intro">次の文を日本語にしてみましょう。<br />Translate the following sentences into Japanese.</p>
    <div className="drills">
      <div className="quiz">
        <div className="quiz-q">He is a student.</div>
        <div className="quiz-a">
          <button className="quiz-toggle" type="button">こたえを見る</button>
          <p className="quiz-answer">かれはがくせいです。</p>
          <p className="quiz-note">彼は学生です。</p>
        
          <SelfGradingButtons blockId="lesson11_quiz_6" onGraded={onSaveQuizResult} initialValue={annotations?.["lesson11_quiz_6"]?.find(ann => ann.action === "quiz_result")?.content || null} />
        </div>
      </div>
      <div className="quiz">
        <div className="quiz-q">I am a teacher.</div>
        <div className="quiz-a">
          <button className="quiz-toggle" type="button">こたえを見る</button>
          <p className="quiz-answer">わたしはせんせいです。</p>
          <p className="quiz-note">私は先生です。</p>
        
          <SelfGradingButtons blockId="lesson11_quiz_7" onGraded={onSaveQuizResult} initialValue={annotations?.["lesson11_quiz_7"]?.find(ann => ann.action === "quiz_result")?.content || null} />
        </div>
      </div>
      <div className="quiz">
        <div className="quiz-q">This is a book.</div>
        <div className="quiz-a">
          <button className="quiz-toggle" type="button">こたえを見る</button>
          <p className="quiz-answer">これはほんです。</p>
          <p className="quiz-note">これは本です。</p>
        
          <SelfGradingButtons blockId="lesson11_quiz_8" onGraded={onSaveQuizResult} initialValue={annotations?.["lesson11_quiz_8"]?.find(ann => ann.action === "quiz_result")?.content || null} />
        </div>
      </div>
    </div>
  </section>

  <section className="section">
    <h2 className="section-title"><span className="num">9</span>自由に話してみよう！ Let's Talk Freely!</h2>
    <p className="section-intro">「〇〇は▼▼です」の文型を使って、自分自身（じしん）や周り（まわり）のものについて紹介してみましょう！<br />Use the sentence pattern to introduce yourself and things around you!</p>
    <AnswerField blockId="lesson11_practice_free" initialValue={annotations?.['lesson11_practice_free']?.find(ann => ann.action === 'answer')?.content || ''} onSave={onSaveAnswer} />
    <div className="sample-wrap">
      <button className="sample-toggle" type="button">回答例を見る</button>
      <div className="sample-content">
        <p>わたしは（なまえ）です。（なまえ）はがくせいです。これはかばんです。あれはえきです。</p>
        <p>My name is ___. I am a student. This is a bag. That is a train station.</p>
      </div>
    </div>
  </section>

    </>
  );
}

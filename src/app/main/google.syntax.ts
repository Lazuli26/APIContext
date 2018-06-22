// tslint:disable:max-line-length
export const keyWords = [
  'Angular'
];
export const labels = {
    UNKNOWN: `Unknown relationship`,
    ABBREV: `An abbreviation of the head token.
    \nExample:
    British Broadcasting Company (BBC)
                         Head    ABBREV`,
    ACOMP:
    `An adjectival phrase that functions as a complement (like an object of the verb).This relation specifically includes 'be' copula constructions with adjective predicates.
    \nExample:
    The book looks heavy.
             Head  ACOMP`,
    ADVCL:
    `An adverbial clause modifying a verb, such as a temporal clause, consequence, conditional clause, or purpose clause.
    \nExample:
    The accident happened as the night was falling.
                 Head                      ADVCL`,
    ADVPHMOD:
    `Adverbial phrase modifier (Japanese)`,
    ADVMOD:
    `A (non clausal) adverb or adverbial phrase that serves to modify the meaning of a word.
    \nExample:
    Genetically modified food.
    ADVMOD      Head`,
    AMOD:
    `An adjectival phrase that serves to modify the meaning of a noun phrase.
    \nExample:
    Sam eats red  meat.
             AMOD Head`,
    APPOS:
    `A noun phrase immediately to the right of another noun phrase, with the second phrase serving to define or modify the first.
    \nExample:
    Sam, my brother, arrived.
    Head    APPOS`,
    ATTR:
    `A nominal phrase headed by a copular verb. Note that 'ATTR' is different from 'ACOMP' in that the dependent is a noun phrase, not an adjective.
    \nExample:
    He is  a doctor.
       Head ATTR`,
    AUX:
    `A non main verb, such as a modal auxiliary or a form of 'be', 'do', or 'have' in a periphrastic tense. Excludes the use of 'be' as an auxiliary in a passive construction.
    \nExample:
    Reagan has died.
           AUX Head`,
    CC:
    `The relation between an element of a conjunct and the coordinating conjunction. One conjunct of a conjunction (normally the first) is treated as the head of the conjunction.
    \nExample:
    Bill is big  and honest.
            Head CC`,
    CCOMP:
    `A dependent clause with an internal subject that functions like an object of the verb or adjective.
    \nExample:
    He says that you like  to swim.
       Head          CCOMP`,
    CONJ:
    `The relation between two elements connected by a coordinating conjunction, such as 'and' or 'or'. The head of the relation is the first conjunct and other conjunctions depend on it via the 'conj' relation.
    \nExample:
    Bill is big and honest.
            Head    CONJ`,
    CSUBJ:
    `A clausal syntactic subject of a clause; that is, the subject is itself a clause ("What she said" in the \nExample below).
    \nExample:
    What she said  makes sense.
             CSUBJ Head`,
    CSUBJPASS:
    `A clausal syntactic subject of a passive clause.
    \nExample:
    That she lied was suspected by everyone.
             CSUBJ    Head`,
    DEP:
    `The system is unable to determine a more precise dependency relation between two words.
    \nExample:
    Then, as if  to show that he could, . . .
             DEP    Head`,
    DET:
    `The relation between the head of a noun phrase and its determiner.
    \nExample:
    The man is here.
    DET Head`,
    DISCOURSE:
    `Interjections and other discourse elements that are not clearly linked to the structure of the sentence, except in an expressive way. \nExamples are interjections (''oh'', ''uh huh'', ''Welcome''), fillers (''um'', ''ah''), and discourse markers (''well'', ''like'', ''actually'', but not ''you know'').
    \nExample:
    Iguazu is   in Argentina :)
           Head              DISCOURSE`,
    DOBJ:
    `The noun phrase that is the ([accusative](https://en.wikipedia.org/wiki/Accusative_case)) object of a verb.
    \nExample:
    She gave me a raise.
        Head      DOBJ`,
    EXPL:
    `Pleonastic nominal. In English, this is some uses of 'it' and 'there': the existential 'there', and 'it' when used in extraposition constructions. An expletive or pleonastic nominal is one where the nominal does not satisfy a semantic role of the predicate. In languages with expletives, they can be positioned in the subject and direct object slots.
    \nExample:
    There is   a ghost in the room.
    EXPL  Head   NSUBJ`,
    GOESWITH:
    `Links two parts of a word that are separated in text.`,
    IOBJ:
    `The noun phrase that is the ([dative](https://en.wikipedia.org/wiki/Dative_case)) indirect object of a verb.
    \nExample:
    She gave me   a present.
        Head IOBJ   DOBJ`,
    MARK:
    `The word introducing a finite or non finite subordinate clause, such as ''that'' or ''whether''. The head is the head of the subordinate clause.
    \nExample:
    Forces engaged in fighting after insurgents attacked.
                               MARK             Head`,
    MWE:
    `One of the two relations (alongside 'NN') for compounding. It is used for certain fixed grammaticized expressions with function words that behave like a single function word. Multiword expressions are annotated in a flat, head initial structure, in which all words in the expression modify the first one using the 'MWE' label.
    \nExample:
    I like dogs as   well as  cats.
                Head MWE  MWE`,
    MWV:
    `Multi word verbal expression.`,
    NEG:
    `The relation between a negation word and the word it modifies.
    \nExample:
    Bill is    not a scientist.
         Head  NEG`,
    NN:
    `Any noun that serves to modify the head noun.
    \nExample:
    phone book
    NN    Head`,
    NPADVMOD:
    `A noun phrase used as an adverbial modifier.
    \nExample:
    The director is 65 years    old.
                       NPADVMOD Head`,
    NSUBJ:
    `A noun phrase that is the syntactic subject of a clause.
    \nExample:
    Clinton defeated Dole.
    NSUBJ   Head`,
    NSUBJPASS:
    `A noun phrase that is the syntactic subject of a passive clause.
    \nExample:
    Dole       was defeated by Clinton.
    NSUBJPASS      Head`,
    NUM:
    `Any number phrase that serves to modify the meaning of the noun with a quantity.
    \nExample:
    Sam ate three sheep.
            NUM   Head`,
    NUMBER:
    `Part of a number phrase.
    \nExample:
    I have four   thousand sheep.
           NUMBER Head`,
    P:
    `Any piece of punctuation in a clause.`,
    PARATAXIS:
    `The parataxis relation (from Greek for “place side by side”) is a relation between a word (often the main predicate of a sentence) and other elements placed side by side without any explicit coordination, subordination, or argument relation with the head word. Parataxis is a discourse like equivalent of coordination.
    \nExample:
    Let's face it we're annoyed.
    Head                PARATAXIS`,
    PARTMOD:
    `Participial modifier`,
    PCOMP:
    `Used when the complement of a preposition is a clause or prepositional phrase (or occasionally, an adverbial phrase).
    \nExample:
    We have no information on   whether users are   at risk.
                           Head               PCOMP`,
    POBJ:
    `The head of a noun phrase following a preposition or the adverbs ''here'' and ''there''.
    \nExample:
    I sat on   the chair.
          Head     POBJ`,
    POSS:
    `A possessive determiner or [genitive](https://en.wikipedia.org/wiki/Genitive_case) modifier.
    \nExample:
    their offices
    POSS  Head`,
    POSTNEG:
    `Postverbal negative particle`,
    PRECOMP:
    `Predicate complement`,
    PRECONJ:
    `A word that appears at the beginning bracketing a conjunction, such as ''either'', ''both'', ''neither'').
    \nExample:
    Both    the boys and the girls are here.
    PRECONJ     Head`,
    PREDET:
    `A word that precedes and modifies the meaning of a noun phrase determiner.
    \nExample:
    All    the boys are here.
    PREDET     Head`,
    PREF:
    `Prefix`,
    PREP:
    `Any prepositional phrase that serves to modify the meaning of a verb, adjective, noun, or even another preposition.
    \nExample:
    I saw a cat  in   a hat.
            Head PREP`,
    PRONL:
    `The relationship between a verb and verbal morpheme (French)`,
    PRT:
    `A verb particle.
    \nExample:
    They shut down the station.
         Head PRT`,
    PS:
    `Associative or possessive marker`,
    QUANTMOD:
    `Quantifier phrase modifier`,
    RCMOD:
    `A link from a noun to the verb which heads a relative clause.
    \nExample:
    I saw the man  you love.
              Head     RCMOD`,
    RCMODREL:
    `Complementizer in relative clause (Chinese)`,
    RDROP:
    `Ellipsis without a preceding predicate (Japanese)`,
    REF:
    `Referent (Hindi)`,
    REMNANT:
    `Used for ellipsis.
    \nExample:
    John won bronze, Mary silver, and Sandy gold.
             Head         REMNANT           REMNANT`,
    REPARANDUM:
    `Indicates disfluencies overridden in a speech repair.
    \nExample:
    Go to         the righ  to   the left.
       REPARANDUM           Head`,
    ROOT:
    `The root of the sentence. In vast majority of cases it is a verb.`,
    SNUM:
    `Suffix specifying a unit of number(Japanese)`,
    SUFF: `Suffix`,
    TMOD:
    `A bare noun phrase constituent that serves to modify the meaning of the constituent by specifying a time. 'TMOD' captures temporal points and duration; it does not capture repetition (''two times'', which would be an ''NPADVMOD'').
    \nExample:
    Last night, I swam in the pool.
         TMOD     Head`,
    TOPIC:
    `Topic marker (Chinese)`,
    VMOD:
    `A clause headed by an infinite form of the verb.
    \nExample:
    Berries gathered on this side of the mountain are sweeter.
    Head    VMOD`,
    VOCATIVE:
    `Marks a dialogue participant addressed in text (common in emails and newsgroup postings).
    \nExample:
    Anna,    can you bring a tent?
    VOCATIVE         Head`,
    XCOMP:
    `A clausal complement without its own subject, whose reference is determined by an external subject.
    \nExample:
    He says that you like to swim.
                     Head    XCOMP`,
    SUFFIX:
    `Name suffix`,
    TITLE:
    `Name title`,
    AUXCAUS:
    `Causative auxiliary (Japanese)`,
    AUXVV:
    `Helper auxiliary (Japanese)`,
    DTMOD:
    `Rentaishi (Prenominal modifier)`,
    FOREIGN:
    `Foreign words`,
    KW:
    `Keyword`,
    LIST:
    `List for chains of comparable items`,
    NOMC:
    `Nominalized clause`,
    NOMCSUBJ:
    `Nominalized clausal subject`,
    NOMCSUBJPASS:
    `Nominalized clausal passive`,
    NUMC:
    `Compound of numeric modifier (Japanese)`,
    COP:
    `Copula (Spanish)`,
    DISLOCATED:
    `Dislocated relation (for fronted/topicalized elements)`,
    ASP:
    `Aspect marker`,
    GMOD:
    `Genitive modifier`,
    GOBJ:
    `Genitive object`,
    INFMOD:
    `Infinitival modifier`,
    MES:
    `Measure`,
    NCOMP:
    `Nominal complement of a noun`
};

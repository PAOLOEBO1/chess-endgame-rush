# E-mails de Gambix : expéditeur et modèles

Réglages faits à la main dans Brevo et Supabase (rien dans le code). À refaire si le nom de l'appli change.

## 1 et 2. Expéditeur : inchangé pour l'instant (décision du 13/10/2026)

Brevo refuse `parbatruc41@proton.me` comme expéditeur : la politique DMARC de proton.me exige un domaine authentifié,
ce qui est impossible pour un domaine qu'on ne possède pas. L'expéditeur reste donc l'adresse actuelle.
Solution durable si besoin plus tard : un nom de domaine à soi, authentifié dans Brevo (Senders, Domains & Dedicated IPs
→ Domains), puis expéditeur `noreply@<domaine>` et mise à jour de Supabase → Authentication → Emails → SMTP Settings
(Sender email, Sender name `Gambix`).

## 3. Modèles d'e-mails (Authentication → Emails → Templates)

Coller l'objet et le corps (onglet *Source*) de chaque modèle, puis **Save**.
`{{ .ConfirmationURL }}` est remplacé par Supabase par le lien à cliquer : ne pas le modifier.

### Confirm signup
Objet : `Gambix : confirme ton adresse e-mail`

```html
<h2>Bienvenue sur Gambix</h2>
<p>Pour activer ton compte et retrouver tes scores sur tous tes appareils, confirme ton adresse :</p>
<p><a href="{{ .ConfirmationURL }}">Confirmer mon adresse</a></p>
<p>Si tu n'as pas créé de compte sur Gambix, ignore ce message : aucun compte ne sera activé.</p>
<p>— Gambix, entraînement aux finales d'échecs</p>
```

### Reset password
Objet : `Gambix : choisis un nouveau mot de passe`

```html
<h2>Nouveau mot de passe</h2>
<p>Une demande de nouveau mot de passe a été faite pour ton compte Gambix.</p>
<p><a href="{{ .ConfirmationURL }}">Choisir un nouveau mot de passe</a></p>
<p>Si ce n'est pas toi, ignore ce message : ton mot de passe actuel reste valable.</p>
<p>— Gambix</p>
```

### Change email address, Magic link, Invite user, Reauthentication
Non utilisés par Gambix aujourd'hui (l'appli ne fait que l'inscription et le mot de passe oublié) : on peut les laisser tels quels.

## 4. Vérification

Créer un compte de test avec une autre adresse : l'e-mail doit venir de « Gambix », avec le nouvel objet,
et ne pas arriver dans les indésirables. Faire de même avec « Mot de passe oublié ».

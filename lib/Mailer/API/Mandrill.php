<?php
namespace MailPoet\Mailer\API;

if(!defined('ABSPATH')) exit;

class Mandrill {
  function __construct($apiKey, $fromEmail, $fromName) {
    $this->url = 'https://mandrillapp.com/api/1.0/messages/send.json';
    $this->apiKey = $apiKey;
    $this->fromName = $fromName;
    $this->fromEmail = $fromEmail;
  }

  function send($newsletter, $subscriber) {
    $this->newsletter = $newsletter;
    $this->subscriber = $this->processSubscriber($subscriber);
    $result = wp_remote_post(
      $this->url,
      $this->request()
    );
    return (
      !is_wp_error($result) === true &&
      !preg_match('!invalid!', $result['body']) === true &&
      wp_remote_retrieve_response_code($result) === 200
    );
  }

  function processSubscriber($subscriber) {
    preg_match('!(?P<name>.*?)\s<(?P<email>.*?)>!', $subscriber, $subscriberData);
    if(!isset($subscriberData['email'])) {
      $subscriberData = array(
        'email' => $subscriber,
      );
    }
    return array(
        'email' => $subscriberData['email'],
        'name' => (isset($subscriberData['name'])) ? $subscriberData['name'] : ''
    );
  }

  function getBody() {
    return array(
      'key' => $this->apiKey,
      'message' => array(
        'from_email' => $this->fromEmail,
        'from_name' => $this->fromName,
        'to' => array($this->subscriber),
        'subject' => $this->newsletter['subject'],
        'html' => $this->newsletter['body']['html'],
        'text' => $this->newsletter['body']['text']
      ),
      'async' => false,
    );
  }

  function request() {
    return array(
      'timeout' => 10,
      'httpversion' => '1.0',
      'method' => 'POST',
      'headers' => array(
        'Content-Type' => 'application/json'
      ),
      'body' => json_encode($this->getBody())
    );
  }
}
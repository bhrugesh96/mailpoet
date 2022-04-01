<?php declare(strict_types = 1);

namespace MailPoet\REST\Automation\Workflows;

require_once __DIR__ . '/../AutomationTest.php';

use MailPoet\REST\Automation\AutomationTest;

class WorkflowsPostTest extends AutomationTest {
  private const ENDPOINT_PATH = '/mailpoet/v1/automation/workflows';

  public function testGuestNotAllowed(): void {
    wp_set_current_user(0);
    $data = $this->post(self::ENDPOINT_PATH);

    $this->assertSame([
      'code' => 'rest_forbidden',
      'message' => 'Sorry, you are not allowed to do that.',
      'data' => ['status' => 401],
    ], $data);
  }

  public function testNoBody(): void {
    $data = $this->post(self::ENDPOINT_PATH);

    $this->assertSame([
      'code' => 'mailpoet_automation_api_no_json_body',
      'message' => 'No JSON body passed.',
      'data' => ['status' => 400],
    ], $data);
  }

  public function testCreateWorkflow(): void {
    $data = $this->post(self::ENDPOINT_PATH, [
      'json' => [
        'name' => 'Testing workflow',
        'steps' => [],
      ],
    ]);

    $this->assertSame(['data' => null], $data);
  }
}
